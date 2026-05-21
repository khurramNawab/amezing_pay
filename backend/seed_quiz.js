import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuizQuestion from './models/QuizQuestion.js';
import AppConfig from './models/AppConfig.js';

dotenv.config();

const questions = [
  { prompt: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctIndex: 2, difficulty: "easy", category: "Geography" },
  { prompt: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 1, difficulty: "easy", category: "Science" },
  { prompt: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3, difficulty: "easy", category: "Geography" },
  { prompt: "Who wrote 'Hamlet'?", options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"], correctIndex: 1, difficulty: "easy", category: "Literature" },
  { prompt: "What is the square root of 64?", options: ["6", "7", "8", "9"], correctIndex: 2, difficulty: "easy", category: "Math" },
  { prompt: "What is the chemical symbol for Gold?", options: ["Ag", "Au", "Pb", "Fe"], correctIndex: 1, difficulty: "easy", category: "Science" },
  { prompt: "In what year did the Titanic sink?", options: ["1910", "1912", "1914", "1916"], correctIndex: 1, difficulty: "easy", category: "History" },
  { prompt: "How many continents are there?", options: ["5", "6", "7", "8"], correctIndex: 2, difficulty: "easy", category: "Geography" },
  { prompt: "What is the tallest mammal?", options: ["Elephant", "Giraffe", "Hippopotamus", "Rhino"], correctIndex: 1, difficulty: "easy", category: "Science" },
  { prompt: "Which element is most abundant in the Earth's atmosphere?", options: ["Oxygen", "Carbon", "Nitrogen", "Hydrogen"], correctIndex: 2, difficulty: "easy", category: "Science" },
  { prompt: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correctIndex: 2, difficulty: "easy", category: "Math" },
  { prompt: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], correctIndex: 2, difficulty: "easy", category: "Art" },
  { prompt: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], correctIndex: 3, difficulty: "easy", category: "Science" },
  { prompt: "Which is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correctIndex: 1, difficulty: "easy", category: "Science" },
  { prompt: "How many bones are there in the adult human body?", options: ["206", "208", "210", "212"], correctIndex: 0, difficulty: "easy", category: "Science" },
  { prompt: "Which language has the most native speakers?", options: ["English", "Spanish", "Mandarin Chinese", "Hindi"], correctIndex: 2, difficulty: "easy", category: "Geography" },
  { prompt: "Who was the first person to walk on the moon?", options: ["Yuri Gagarin", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"], correctIndex: 2, difficulty: "easy", category: "History" },
  { prompt: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correctIndex: 2, difficulty: "easy", category: "Science" },
  { prompt: "Which country is home to the kangaroo?", options: ["India", "Brazil", "Australia", "South Africa"], correctIndex: 2, difficulty: "easy", category: "Geography" },
  { prompt: "What color do you get when you mix blue and yellow?", options: ["Green", "Purple", "Orange", "Brown"], correctIndex: 0, difficulty: "easy", category: "Art" }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amezing_pay');
    
    // Clear existing questions if needed, or just insert them. Let's insert only.
    await QuizQuestion.deleteMany({});
    console.log("Cleared old questions.");

    await QuizQuestion.insertMany(questions);
    console.log("Successfully inserted 20 quiz questions.");

    // Ensure users have to answer 5 questions
    let config = await AppConfig.getSingleton();
    if (!config.earnzone) config.earnzone = {};
    if (!config.earnzone.quiz) config.earnzone.quiz = {};
    
    config.earnzone.quiz.questionsCount = 5;
    config.earnzone.quiz.enabled = true;
    config.earnzone.quiz.difficulty = 'easy'; // ensure difficulty matches our questions
    await config.save();
    console.log("AppConfig updated to require 5 questions per quiz.");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding questions:", error);
    process.exit(1);
  }
};

seedData();
