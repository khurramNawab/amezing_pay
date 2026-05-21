import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AppConfig from '../models/AppConfig.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkConfig = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const config = await AppConfig.getSingleton();
        console.log('Earn Zone Config:', JSON.stringify(config.earnzone, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkConfig();
