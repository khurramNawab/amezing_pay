import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkUserDetail = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'khurramnawab31@gmail.com' });
        if (user) {
            console.log('User found:');
            console.log('Email:', user.email);
            console.log('Has Password:', !!user.password);
            console.log('Password Hash:', user.password);
            console.log('Verified:', user.emailVerified);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUserDetail();
