import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const deleteStuckUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await User.deleteOne({ email: 'khurramnawab31@gmail.com' });
        console.log('Delete result:', result);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

deleteStuckUser();
