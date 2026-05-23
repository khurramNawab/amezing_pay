import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import {
  buildWalletSummary,
  ensureUserWallets,
} from "../services/walletService.js";
import { logEvent } from "../services/loggerService.js";
import { logger } from "../services/logger.js";
import { sendVerificationEmail } from "../services/emailVerificationService.js";

/**
 * Generate Access and Refresh Tokens
 */
const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign({ id }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

/**
 * Register
 */
export const register = async (req, res) => {
  const { email, password, phone, name, referralCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // If user exists but has no password (migrated or partial registration), allow them to "register" by setting a password
      if (!user.password) {
        user.password = password;
        if (phone) user.phone = phone;
        if (name) user.name = name;
        user.emailVerified = false; // Reset verification to ensure they own the email
        await user.save();
        
        await ensureUserWallets(user._id);
        
        try {
          await sendVerificationEmail(user);
        } catch (emailErr) {
          logger.error("[EMAIL_VERIFY] Failed to send verification email:", { message: emailErr.message });
        }

        return res.status(200).json({ 
          success: false,
          needsVerification: true,
          message: "Account found from previous version. A new verification link has been sent to your email. Please verify to set your password." 
        });
      }
      
      // If user exists but hasn't verified their email yet -> help them recover!
      if (!user.emailVerified) {
        // Optionally update their password to the new one they just typed
        user.password = password;
        if (phone) user.phone = phone;
        if (name) user.name = name;
        await user.save();

        try {
          await sendVerificationEmail(user);
        } catch (emailErr) {
          logger.error("[EMAIL_VERIFY] Failed to send verification email:", { message: emailErr.message });
        }

        return res.status(403).json({ 
          success: false,
          needsVerification: true,
          message: "Your account exists but your email is not verified. We've sent a new verification link to your inbox." 
        });
      }
      
      return res.status(400).json({ success: false, message: "User already exists with this email" });
    }

    user = await User.create({
      email: email.toLowerCase(),
      password,
      phone: phone || "",
      name: name || `User_${Math.floor(1000 + Math.random() * 9000)}`,
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      referredBy: referralCode || null,
      emailVerified: false,
    });
    await ensureUserWallets(user._id);

    try {
      await sendVerificationEmail(user);
    } catch (emailErr) {
      logger.error("[EMAIL_VERIFY] Failed to send verification email:", { message: emailErr.message });
    }

    await logEvent({
      userId: user._id,
      event: "LOGIN_SUCCESS",
      status: "SUCCESS",
      req,
      metadata: { type: "REGISTER" },
    });

    res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({ 
        message: "Your account was migrated from a previous version. Please use the Sign Up screen to set your password and verify your email." 
      });
    }

    if (!(await user.matchPassword(password))) {
      await logEvent({
        event: "LOGIN_FAILED",
        status: "FAILURE",
        req,
        metadata: { email, reason: "INVALID_CREDENTIALS" },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBlocked) return res.status(403).json({ message: "Account suspended." });
    
    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email to proceed. You can request a new verification link if needed." });
    }

    await logEvent({
      userId: user._id,
      event: "LOGIN_SUCCESS",
      status: "SUCCESS",
      req,
      metadata: { type: "LOGIN" },
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    const walletSummary = await buildWalletSummary(user._id);

    res.status(200).json({
      user: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        kycStatus: user.kycStatus,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
      wallet: walletSummary,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Refresh Token
 */
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "Token required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      await logEvent({
        event: "TOKEN_REFRESH",
        status: "FAILURE",
        req,
        metadata: { reason: "INVALID" },
      });
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(403).json({ message: "Expired or invalid" });
  }
};

/**
 * Profile & Misc
 */
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken -emailVerificationToken');
  user ? res.json(user) : res.status(404).json({ message: "Not found" });
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, phone } = req.body;
    if (name) user.name = name;
    if (email && email.toLowerCase() !== user.email) {
      user.email = email.toLowerCase();
      user.emailVerified = false; // Must re-verify new email
    }
    if (phone) user.phone = phone;

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;
    delete safeUser.emailVerificationToken;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { currentPassword, newPassword } = req.body;

    if (!user.password) {
      return res.status(400).json({ message: "No password set for this account." });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const logout = async (req, res) => {
  const confirmation = req.body.confirmation;
  if (!confirmation || confirmation !== "yes") {
    return res
      .status(400)
      .json({ message: "Logout confirmation is required." });
  }

  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
  res.json({ message: "Logged out" });
};

export const submitKyc = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.kycStatus = "pending";
    await user.save();

    await logEvent({
      userId: user._id,
      event: "KYC_SUBMITTED",
      status: "SUCCESS",
      req,
    });
    res.json({ message: "KYC submitted successfully", status: "pending" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Verify Email via Token Link
 * GET /api/auth/verify-email/:token  OR  GET /api/verify-email?token=...
 *
 * Returns a premium HTML page instead of raw JSON for browser users.
 * API consumers (mobile) receive JSON via Accept: application/json header.
 */
export const verifyEmail = async (req, res) => {
  const token = req.params.token || req.query.token;
  const wantsJson = req.query.format === 'json' || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html'));

  const sendError = (status, message) => {
    if (wantsJson) return res.status(status).json({ success: false, message });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(buildVerifyPage(false, message));
  };

  if (!token) return sendError(400, "Verification token is missing.");

  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      // Check if already verified (token cleared but user exists)
      const alreadyVerified = await User.findOne({ emailVerified: true, email: { $exists: true } });
      return sendError(400, "This verification link is invalid or has expired. Please request a new one from the app.");
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    await logEvent({
      userId: user._id,
      event: "EMAIL_VERIFIED",
      status: "SUCCESS",
      req,
    });

    if (wantsJson) {
      return res.json({
        success: true,
        message: "Email verified successfully! You can now use all features.",
      });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(buildVerifyPage(true, "Email verified successfully! You can now log in to the app."));
  } catch (error) {
    return sendError(500, "An error occurred. Please try again.");
  }
};

/**
 * Build a premium HTML verification result page
 */
function buildVerifyPage(success, message) {
  const iconSvg = success
    ? `<svg class="verify-svg success" viewBox="0 0 52 52">
        <circle class="verify-circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="verify-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
       </svg>`
    : `<svg class="verify-svg error" viewBox="0 0 52 52">
        <circle class="verify-circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="verify-cross-line1" fill="none" d="M16 16 36 36"/>
        <path class="verify-cross-line2" fill="none" d="M36 16 16 36"/>
       </svg>`;

  const accentColor = success ? '#6366F1' : '#EF4444';
  const titleText   = success ? 'Email Verified Successfully' : 'Verification Expired';
  const appDeepLink = 'amezingpay://login';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${titleText} — Amezing Pay</title>
  <meta name="description" content="Amezing Pay email verification result"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top left, #1E1B4B 0%, #0F172A 40%, #020617 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow-x: hidden;
    }
    
    /* Decorative glowing background mesh rings */
    .bg-glow-1 {
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%);
      top: -100px;
      left: -100px;
      z-index: 1;
      pointer-events: none;
    }
    
    .bg-glow-2 {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(167, 139, 250, 0.12) 0%, rgba(167, 139, 250, 0) 70%);
      bottom: -150px;
      right: -150px;
      z-index: 1;
      pointer-events: none;
    }

    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 460px;
    }

    .card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 32px;
      padding: 48px 36px;
      text-align: center;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 100px rgba(99, 102, 241, 0.1);
      animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 8px 18px;
      margin-bottom: 36px;
      gap: 8px;
    }

    .logo-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366F1;
      box-shadow: 0 0 10px #6366F1;
    }

    .logo-name {
      font-size: 15px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Icon Ring and Animation */
    .icon-container {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 32px;
      position: relative;
    }

    .icon-container::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 1px solid ${accentColor};
      opacity: 0.3;
      animation: ripple 2s infinite ease-out;
    }

    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .verify-svg {
      width: 56px;
      height: 56px;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .success {
      stroke: #10B981;
    }

    .error {
      stroke: #EF4444;
    }

    .verify-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 3;
      fill: none;
      animation: drawCircle 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .verify-check {
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: drawCheck 0.4s 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .verify-cross-line1, .verify-cross-line2 {
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
    }

    .verify-cross-line1 {
      animation: drawCheck 0.3s 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .verify-cross-line2 {
      animation: drawCheck 0.3s 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes drawCircle {
      to { stroke-dashoffset: 0; }
    }

    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }

    h1 {
      font-size: 26px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      line-height: 1.25;
    }

    p {
      font-size: 15px;
      color: #94A3B8;
      line-height: 1.6;
      margin-bottom: 36px;
      font-weight: 400;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 600;
      padding: 16px 28px;
      border-radius: 16px;
      text-decoration: none;
      width: 100%;
      margin-bottom: 24px;
      transition: all 0.2s ease;
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(99, 102, 241, 0.45);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .timer-note {
      font-size: 13px;
      color: #64748B;
      font-weight: 500;
    }

    .divider {
      height: 1px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%);
      margin: 28px 0;
    }

    .secure-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: rgba(148, 163, 184, 0.4);
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .secure-badge svg {
      width: 12px;
      height: 12px;
      opacity: 0.5;
    }
  </style>
  ${success ? `<script>
    let countdown = 5;
    function tick() {
      const el = document.getElementById('timer');
      if (!el) return;
      el.innerHTML = 'Automatically redirecting you in <strong style="color: #6366F1">' + countdown + 's</strong>...';
      if (countdown <= 0) {
        window.location.href = '${appDeepLink}';
        return;
      }
      countdown--;
      setTimeout(tick, 1000);
    }
    window.onload = tick;
  </script>` : ''}
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  
  <div class="container">
    <div class="card">
      <div class="logo-container">
        <div class="logo-dot"></div>
        <span class="logo-name">Amezing Pay</span>
      </div>
      
      <div class="icon-container">
        ${iconSvg}
      </div>
      
      <h1>${titleText}</h1>
      <p>${message}</p>
      
      ${success ? `
      <a href="${appDeepLink}" class="btn-primary">
        Launch Amezing Pay App
      </a>
      <p id="timer" class="timer-note">Automatically redirecting you in 5s...</p>
      ` : `
      <a href="${appDeepLink}" class="btn-primary">Open App to Retry</a>
      <p class="timer-note">Please request a new link inside the verification screen.</p>
      `}
      
      <div class="divider"></div>
      
      <div class="secure-badge">
        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        Secure & Encrypted
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Resend Verification Email
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    await sendVerificationEmail(user);
    res.json({
      success: true,
      message: `Verification email sent to ${user.email}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

    const { sendMail } = await import('../services/emailVerificationService.js');
    const { wrapInTemplate } = await import('../utils/emailTemplate.js');

    const contentHtml = `
      <p>Hi <strong>${user.name || 'there'}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
        Or copy this link into your browser:<br>
        <a href="${resetUrl}" style="color: #673ab7; word-break: break-all;">${resetUrl}</a>
      </p>
      <p style="color: #f59e0b; font-size: 13px; margin-top: 20px;">
        ⏳ This link will expire in 1 hour. If you did not request this, ignore this email.
      </p>
    `;

    const html = wrapInTemplate("Reset Your Password", contentHtml, "Reset Password", resetUrl);

    // Use nodemailer directly since sendMail is not exported
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport(
      process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          }
        : {
            service: 'gmail',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          }
    );
    await transporter.sendMail({
      from: `"AmazingPay Services" <${process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: user.email,
      subject: '🔐 Reset your AmazingPay password',
      html,
    });

    logger.info(`[FORGOT_PASSWORD] Reset email sent to ${user.email}`);
    return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    logger.error('[FORGOT_PASSWORD] Error', { message: error.message });
    return res.status(500).json({ message: 'Could not process request' });
  }
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.password || '');

    if (!token) return res.status(400).json({ message: 'Reset token is required' });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    await logEvent({
      userId: user._id,
      event: 'PASSWORD_RESET',
      status: 'SUCCESS',
      req,
    });

    logger.info(`[RESET_PASSWORD] Password reset for ${user.email}`);
    return res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    logger.error('[RESET_PASSWORD] Error', { message: error.message });
    return res.status(500).json({ message: 'Could not reset password' });
  }
};
