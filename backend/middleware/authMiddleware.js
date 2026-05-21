import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../services/logger.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Not authorized, token missing' });
            }
            const decoded = jwt.verify(token, env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');
            if (req.user?.isBlocked) {
                return res.status(403).json({ message: 'Account is blocked' });
            }

            return next();
        } catch (error) {
            logger.warn('Auth token verification failed', { message: error?.message });
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

export const requireAdminRole = (...allowed) => (req, res, next) => {
    const role = req.user?.adminRole;
    if (!allowed.length) return next();
    if (role && allowed.includes(role)) return next();
    return res.status(403).json({ message: 'Forbidden: insufficient admin role' });
};
