import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import Otp from "../models/Otp.js";
import { logEvent } from "./loggerService.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { wrapInTemplate } from "../utils/emailTemplate.js";

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;

/**
 * Universal Email Sender (Supports SendGrid or Direct SMTP)
 */
const sendMail = async (options) => {
  const { to, subject, html } = options;
  const apiKey = env.SENDGRID_API_KEY;

  // Use SendGrid if API key is a real SG key
  if (apiKey && apiKey.startsWith("SG.")) {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: env.SENDGRID_FROM_EMAIL || env.SMTP_USER,
      subject,
      html,
    });
    return "sendgrid";
  }

  // Otherwise, use configured SMTP
  const transporter = nodemailer.createTransport(
    env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 587,
          secure: env.SMTP_PORT === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        }
      : {
          service: 'gmail',
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        }
  );

  await transporter.sendMail({
    from: `"AmazingPay Services" <${env.SENDGRID_FROM_EMAIL || env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  return "smtp";
};


/**
 * Generate and Send OTP
 */
export const sendOtp = async (req, phone, email) => {
  if (!email) throw new Error("Email is required for OTP delivery.");

  try {
    // 1. Rate Limiting / Cooldown Check
    const lastOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (lastOtp) {
      const secondsPassed =
        (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
      if (secondsPassed < RESEND_COOLDOWN_SECONDS) {
        throw new Error(
          `Please wait ${RESEND_COOLDOWN_SECONDS - secondsPassed.toFixed(0)} seconds before requesting another OTP.`,
        );
      }
    }

    // 2. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // 3. Send OTP via Email using the global template
    const contentHtml = `
      <p>Your one-time password (OTP) for AmazingPay is:</p>
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 12px;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #673ab7;">${otpCode}</span>
      </div>
      <p style="color: #64748b; font-size: 14px; text-align: center;">
        This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.<br>
        If you didn't request this code, please ignore this email.
      </p>
    `;

    const html = wrapInTemplate(
      "Your OTP Code",
      contentHtml
    );

    const mailProvider = await sendMail({
      to: email,
      subject: `Your OTP Code: ${otpCode}`,
      html,
    });

    // 4. Save OTP to Database
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);
    
    await Otp.create({ 
      email, 
      phone: phone || 'unknown',
      code: hashedOtp, 
      ipAddress,
      expiresAt,
      createdAt: new Date() 
    });

    await logEvent({ event: "OTP_SENT", status: "SUCCESS", req, metadata: { email, provider: mailProvider } });
    return { success: true, message: "OTP sent successfully." };
  } catch (error) {
    await logEvent({ event: "OTP_ERROR", status: "FAILURE", req, metadata: { email, error: error.message } });
    throw new Error(error.message.includes('Please wait') ? error.message : `Failed to send OTP: ${error.message}`);
  }
};

/**
 * Verify OTP
 */
export const verifyOtpCode = async (req, email, code) => {
  const otpData = await Otp.findOne({ email }).sort({ createdAt: -1 });

  if (!otpData) {
    await logEvent({
      event: "OTP_VERIFIED",
      status: "FAILURE",
      req,
      metadata: { email, reason: "EXPIRED" },
    });
    throw new Error("Code expired or not found.");
  }

  if (otpData.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpData._id });
    await logEvent({
      event: "OTP_VERIFIED",
      status: "FAILURE",
      req,
      metadata: { email, reason: "MAX_ATTEMPTS" },
    });
    throw new Error("Too many failed attempts.");
  }

  const isMatch = await bcrypt.compare(code, otpData.code);
  if (!isMatch) {
    otpData.attempts += 1;
    await otpData.save();
    await logEvent({
      event: "OTP_VERIFIED",
      status: "FAILURE",
      req,
      metadata: { email, reason: "INVALID", attempt: otpData.attempts },
    });
    throw new Error(`Invalid code. ${MAX_ATTEMPTS - otpData.attempts} left.`);
  }

  await Otp.deleteOne({ email });
  await logEvent({
    event: "OTP_VERIFIED",
    status: "SUCCESS",
    req,
    metadata: { email },
  });
  return true;
};
