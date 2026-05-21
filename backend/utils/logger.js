import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const logsDir = path.join(backendRoot, 'logs');

fs.mkdirSync(logsDir, { recursive: true });

import 'winston-daily-rotate-file';

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
});

const combinedRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), logFormat),
    transports: [
        new winston.transports.Console({
            format: combine(colorize(), logFormat),
        }),
        errorRotateTransport,
        combinedRotateTransport,
    ],
});

export const alertAdmin = (title, message) => {
    // In production, wire this to a Discord/Slack/PagerDuty webhook.
    logger.error(`[CRITICAL ALERT] ${title}: ${message}`);
};

