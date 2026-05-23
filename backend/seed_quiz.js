import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuizQuestion from './models/QuizQuestion.js';
import AppConfig from './models/AppConfig.js';

dotenv.config();

const questions = [
  { prompt: "Who is known as the Father of the Indian Constitution?", options: ["Mahatma Gandhi", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Subhas Chandra Bose"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which is the largest state in India by area?", options: ["Uttar Pradesh", "Maharashtra", "Rajasthan", "Madhya Pradesh"], correctIndex: 2, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which river is known as the Ganga of the South?", options: ["Godavari", "Krishna", "Cauvery", "Narmada"], correctIndex: 0, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Who was the first female Prime Minister of India?", options: ["Pratibha Patil", "Indira Gandhi", "Sarojini Naidu", "Sushma Swaraj"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which Indian city is known as the 'Pink City'?", options: ["Udaipur", "Jaipur", "Jodhpur", "Jaisalmer"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "In which state is the ancient monument 'Taj Mahal' located?", options: ["Delhi", "Uttar Pradesh", "Rajasthan", "Punjab"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "What is the national currency of India?", options: ["Indian Dollar", "Indian Rupee", "Indian Dinar", "Indian Ringgit"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Who wrote the national anthem of India, 'Jana Gana Mana'?", options: ["Bankim Chandra Chatterjee", "Rabindranath Tagore", "Sarojini Naidu", "Sri Aurobindo"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which state is known as the 'Spices Garden of India'?", options: ["Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh"], correctIndex: 2, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which is the smallest state in India by area?", options: ["Sikkim", "Goa", "Tripura", "Mizoram"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "What is the capital city of India?", options: ["Mumbai", "Kolkata", "Chennai", "New Delhi"], correctIndex: 3, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Who was the first President of India?", options: ["Dr. Rajendra Prasad", "Dr. S. Radhakrishnan", "Zakir Husain", "V.V. Giri"], correctIndex: 0, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which festival in India is known as the 'Festival of Lights'?", options: ["Holi", "Diwali", "Eid", "Christmas"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which is the largest country in the world by land area?", options: ["Canada", "China", "United States", "Russia"], correctIndex: 3, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which ocean lies to the south of India?", options: ["Pacific Ocean", "Indian Ocean", "Atlantic Ocean", "Arctic Ocean"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "What is the capital of Uttarakhand?", options: ["Dehradun", "Nainital", "Haridwar", "Rishikesh"], correctIndex: 0, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which organ in the human body pumps blood?", options: ["Lungs", "Brain", "Heart", "Kidneys"], correctIndex: 2, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which is the highest mountain peak in the world?", options: ["K2", "Mount Everest", "Kangchenjunga", "Lhotse"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "Which Indian space agency launched the Chandrayaan mission?", options: ["NASA", "ISRO", "ESA", "Roscosmos"], correctIndex: 1, difficulty: "easy", category: "General Knowledge" },
  { prompt: "What is the national animal of India?", options: ["Lion", "Elephant", "Royal Bengal Tiger", "Leopard"], correctIndex: 2, difficulty: "easy", category: "General Knowledge" }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amezing_pay');
    
    // Clear existing questions if needed
    await QuizQuestion.deleteMany({});
    console.log("Cleared old questions.");

    await QuizQuestion.insertMany(questions);
    console.log("Successfully inserted 20 general knowledge quiz questions.");

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
