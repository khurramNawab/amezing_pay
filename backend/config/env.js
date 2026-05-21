import dotenv from 'dotenv';
import { logger } from '../services/logger.js';
dotenv.config();

const requiredEnv = [
    'JWT_SECRET',
    'REFRESH_SECRET',
    'OTP_SECRET',
    'MONGO_URI',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'CASHFREE_APP_ID',
    'CASHFREE_SECRET_KEY',
];

const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
    logger.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// Email transport must be configured via either SMTP_* or SendGrid.
const hasSmtp =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;
const hasSendgrid = !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL;

if (!hasSmtp && !hasSendgrid) {
    logger.error(
        'FATAL ERROR: Missing email configuration. Provide SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or SENDGRID_API_KEY/SENDGRID_FROM_EMAIL',
    );
    process.exit(1);
}

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET,
    OTP_SECRET: process.env.OTP_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
    CASHFREE_ENV: process.env.CASHFREE_ENV || 'TEST',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    API_URL: process.env.API_URL || 'http://localhost:4000',
};
