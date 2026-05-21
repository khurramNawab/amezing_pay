import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    category: { type: String, default: 'general' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizQuestionSchema.index({ difficulty: 1, isActive: 1 });

const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema);
export default QuizQuestion;

