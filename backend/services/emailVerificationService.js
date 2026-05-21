import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { wrapInTemplate } from '../utils/emailTemplate.js';

const VERIFICATION_EXPIRY_HOURS = 24;

/**
 * Universal Email Sender (mirrors otpService sendMail)
 */
const sendMail = async ({ to, subject, html }) => {
    const apiKey = env.SENDGRID_API_KEY;
    if (apiKey && apiKey.startsWith('SG.')) {
        sgMail.setApiKey(apiKey);
        await sgMail.send({ to, from: env.SENDGRID_FROM_EMAIL || env.SMTP_USER, subject, html });
        return 'sendgrid';
    }

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
    return 'smtp';
};

/**
 * Generate a secure token, attach it to user, and send verification email.
 * @param {Object} user - Mongoose User document
 */
export const sendVerificationEmail = async (user) => {
    // 1. Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    // 2. Save token to user document
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expires;
    await user.save();

    // 3. Build verification URL
    const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;

    // 4. Send email using the global template
    const contentHtml = `
        <p>Hi <strong>${user.name || 'there'}</strong>,</p>
        <p>Welcome to AmazingPay! To get started, please verify your email address by clicking the button below.</p>
        <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
            Or copy this link into your browser:<br>
            <a href="${verifyUrl}" style="color: #673ab7; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="color: #f59e0b; font-size: 13px; margin-top: 20px;">
            ⏳ This link will expire in ${VERIFICATION_EXPIRY_HOURS} hours.
        </p>
    `;

    const html = wrapInTemplate(
        "Verify Your Email",
        contentHtml,
        "Verify My Email",
        verifyUrl
    );

    const provider = await sendMail({
        to: user.email,
        subject: '✅ Verify your AmazingPay email',
        html,
    });

    logger.info(`[EMAIL_VERIFY] Verification email sent to ${user.email} via ${provider}`);
    return { token, verifyUrl };
};
