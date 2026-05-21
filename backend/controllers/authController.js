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
          message: "Account found from previous version. A new verification link has been sent to your email. Please verify to set your password." 
        });
      }
      
      return res.status(400).json({ message: "User already exists with this email" });
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
 * GET /api/auth/verify-email/:token
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  if (!token)
    return res
      .status(400)
      .json({ success: false, message: "Verification token is missing." });

  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This verification link is invalid or has expired. Please request a new one.",
      });
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

    res.json({
      success: true,
      message: "Email verified successfully! You can now use all features.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
