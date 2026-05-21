import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../services/logger.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            heartbeatFrequencyMS: 10000,
        });
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        logger.error(`MongoDB Connection Error: ${error.message}`);
        throw error;
    }
};

export default connectDB;
