import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testRegistration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'test_password_save@example.com';
        await User.deleteOne({ email });

        const user = await User.create({
            email,
            password: 'password123',
            name: 'Test User'
        });

        console.log('User created:', user.email);
        console.log('Stored Password Hash:', user.password);
        
        const isMatch = await user.matchPassword('password123');
        console.log('Password Match Test:', isMatch);

        await User.deleteOne({ email });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

testRegistration();
