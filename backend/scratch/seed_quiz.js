import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuizQuestion from '../models/QuizQuestion.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const questions = [
  {
    prompt: "What is the primary goal of affiliate marketing?",
    options: ["Earning commission by promoting others' products", "Building your own manufacturing plant", "Buying products at wholesale prices", "Working as a direct employee of a brand"],
    correctIndex: 0,
    difficulty: "easy",
    category: "Affiliate Marketing"
  },
  {
    prompt: "Which of these is a popular affiliate network in India?",
    options: ["Amazon Associates", "Zomato Gold", "Netflix Premium", "Uber Eats"],
    correctIndex: 0,
    difficulty: "easy",
    category: "Affiliate Marketing"
  },
  {
    prompt: "What does 'CPC' stand for in digital advertising?",
    options: ["Cost Per Click", "Cash Per Customer", "Company Profit Center", "Creative Public Campaign"],
    correctIndex: 0,
    difficulty: "easy",
    category: "Digital Marketing"
  },
  {
    prompt: "How can you share affiliate links effectively?",
    options: ["On social media and blogs", "By shouting on the street", "By sending them to random numbers", "By printing them on a t-shirt"],
    correctIndex: 0,
    difficulty: "easy",
    category: "Marketing"
  },
  {
    prompt: "What is the benefit of a PRO card in AmazingPay?",
    options: ["Higher commission and exclusive tasks", "Free snacks", "Free movie tickets", "Extra mobile data"],
    correctIndex: 0,
    difficulty: "easy",
    category: "App Knowledge"
  },
  {
      prompt: "What is the maximum daily limit in Earn Zone?",
      options: ["Depends on App Config", "₹10", "₹100", "₹1000"],
      correctIndex: 0,
      difficulty: "easy",
      category: "App Knowledge"
  }
];

const seedQuestions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await QuizQuestion.deleteMany();
        await QuizQuestion.insertMany(questions);
        console.log('Successfully seeded quiz questions!');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedQuestions();
