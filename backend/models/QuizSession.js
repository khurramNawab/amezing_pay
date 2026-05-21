import mongoose from 'mongoose';

const quizSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true }],
    timePerQuestionSec: { type: Number, default: 12 },
    status: { type: String, enum: ['active', 'submitted', 'expired'], default: 'active' },
    rewardCredited: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quizSessionSchema.index({ user: 1, createdAt: -1 });

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
export default QuizSession;

