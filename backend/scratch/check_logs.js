import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuditLog from '../models/AuditLog.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkLogs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const logs = await AuditLog.find({ event: 'LOGIN_FAILED' }).sort({ createdAt: -1 }).limit(10);
        console.log('Recent failed login attempts:');
        console.table(logs.map(l => ({
            time: l.createdAt,
            email: l.metadata?.email,
            reason: l.metadata?.reason,
            ip: l.ipAddress
        })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkLogs();
