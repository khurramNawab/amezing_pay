import dns from 'node:dns';
import { env } from './config/env.js';
import connectDB from './config/db.js';
import { logger } from './services/logger.js';
import { createApp } from './app.js';
import { startPayoutWorker, stopPayoutWorker } from './workers/payoutWorker.js';

// Prefer IPv4 to reduce DNS/SRV resolution issues on some networks.
dns.setDefaultResultOrder('ipv4first');

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err.name, err.message, err.stack);
    process.exit(1);
});

try {
    await connectDB();
    startPayoutWorker();
} catch (err) {
    logger.error('FATAL: Database connection failed. Shutting down.');
    process.exit(1);
}

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

const shutdown = async (signal) => {
    try {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        stopPayoutWorker();
        await new Promise((resolve) => server.close(resolve));
        const mongoose = (await import('mongoose')).default;
        await mongoose.disconnect().catch(() => {});
        process.exit(0);
    } catch (e) {
        logger.error('Graceful shutdown failed', { message: e?.message });
        process.exit(1);
    }
};

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    shutdown('unhandledRejection');
});
