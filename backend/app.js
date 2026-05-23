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
import { verifyEmail } from './controllers/authController.js';

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
    app.get('/api/verify-email', verifyEmail);
    app.get('/api/payment-status', (req, res) => {
        const orderId = req.query.order_id || req.query.orderId || '';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amezing Pay - Payment Processed</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0b1220;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}
      .card{width:100%;max-width:440px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.3)}
      .icon{font-size:54px;color:#10b981;margin-bottom:20px;display:inline-block;width:80px;height:80px;line-height:80px;border-radius:50%;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2)}
      .title{font-weight:700;font-size:22px;margin-bottom:8px;letter-spacing:-0.5px}
      .sub{color:#94a3b8;font-size:14px;margin-bottom:24px;line-height:1.5}
      .btn{display:inline-block;width:100%;height:50px;line-height:50px;border-radius:14px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;border:0;cursor:pointer}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✓</div>
      <div class="title">Payment Processed</div>
      <p class="sub" style="margin-top:12px">Order ID: <code style="font-size:12px;color:#3b82f6;background:rgba(59,130,246,0.1);padding:4px 8px;border-radius:6px">${orderId}</code></p>
      <p class="sub">Your transaction status is being updated. You can close this screen now or wait a moment.</p>
      <button onclick="closeWebView()" class="btn">Close Window</button>
    </div>
    <script>
      function closeWebView() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'complete', orderId: "${orderId}" }));
        }
      }
      // Auto-post complete message to trigger auto-close
      setTimeout(closeWebView, 1500);
    </script>
  </body>
</html>`);
    });
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

