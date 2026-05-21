import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { logger } from './services/logger.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import earningsRoutes from './routes/earningsRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import earnZoneRoutes from './routes/earnZoneRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import { apiLimiter, authLimiter } from './middleware/rateLimitMiddleware.js';
import { versionCheck } from './middleware/versionCheckMiddleware.js';

export const createApp = () => {
    const app = express();

    // Trust proxy for rate-limiters
    app.set('trust proxy', 1);

    // Express 5 compatibility: Ensure req.query is writable
    app.use((req, res, next) => {
        const query = req.query;
        Object.defineProperty(req, 'query', {
            value: query,
            enumerable: true,
            writable: true,
            configurable: true
        });
        next();
    });

    // Security & Optimization Middleware
    app.use(helmet());
    app.use(express.json({
        limit: '1mb',
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    app.use(mongoSanitize());
    app.use(hpp());
    app.use(compression());

    // Request Logging
    const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
    app.use(morgan(morganFormat, {
        stream: { write: (message) => logger.info(message.trim()) }
    }));

    if (env.NODE_ENV === 'development') {
        app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginResourcePolicy: false,
        }));
    }

    app.use(cors({
        origin: env.NODE_ENV === 'production'
            ? (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
            : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-app-version',
            'x-platform',
            'x-device-id',
            'x-client-device-id',
            'x-idempotency-key',
        ],
        credentials: true,
    }));

    // Global Rate Limiting
    app.use('/api', apiLimiter);

    // Version & Maintenance Check
    app.use('/api', versionCheck);

    // Static Files
    app.use('/public', express.static('public'));

    // Routes
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/referrals', referralRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/earnings', earningsRoutes);
    app.use('/api/payouts', payoutRoutes);
    app.use('/api/cards', cardRoutes);
    app.use('/api/templates', templateRoutes);
    app.use('/api/uploads', uploadRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/sales', saleRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/earnzone', earnZoneRoutes);
    app.use('/api/system', publicRoutes);
    app.use('/api/support', supportRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/kyc', kycRoutes);

    app.get('/', (req, res) => {
        res.send('API is running...');
    });

    app.get('/api/health', async (req, res) => {
        const mongoState = mongoose.connection.readyState;
        res.status(mongoState === 1 ? 200 : 503).json({
            status: mongoState === 1 ? 'OK' : 'DEGRADED',
            db: mongoState === 1 ? 'connected' : 'disconnected',
            uptime: process.uptime()
        });
    });

    // JSON error handler
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        const status = err?.statusCode || err?.status || 500;
        const message = err?.message || 'Internal Server Error';

        if (status === 500) {
            logger.error(`[ERROR] ${req.method} ${req.url}: ${message}`, { stack: err.stack });
        }

        res.status(status).json({
            success: false,
            message: env.NODE_ENV === 'production' && status === 500 ? 'Something went wrong' : message
        });
    });

    return app;
};

