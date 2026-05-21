import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const manualVerify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const token = 'b1c532c3544e52ba6f231480d6acb2b45c7ebd88e030924fcca2b78ee8704f21';
        
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (user) {
            console.log('User found for token:', user.email);
            user.emailVerified = true;
            user.emailVerificationToken = null;
            user.emailVerificationExpires = null;
            await user.save();
            console.log('✅ Email verified successfully for', user.email);
        } else {
            console.log('❌ Invalid or expired token.');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

manualVerify();
