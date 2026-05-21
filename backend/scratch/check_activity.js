import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkUserActivity = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'khurramnawab31@gmail.com' });
        if (user) {
            console.log('User found:', user.email);
            console.log('Balance:', user.walletBalance);
            const txCount = await Transaction.countDocuments({ user: user._id });
            console.log('Transaction Count:', txCount);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUserActivity();
