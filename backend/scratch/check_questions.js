import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuizQuestion from '../models/QuizQuestion.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkQuestions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await QuizQuestion.countDocuments();
        console.log('Total questions:', count);
        
        const activeEasy = await QuizQuestion.countDocuments({ isActive: true, difficulty: 'easy' });
        console.log('Active Easy questions:', activeEasy);

        if (count === 0) {
            console.log('Seed is needed.');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkQuestions();
