import mongoose from 'mongoose';

const payoutJobSchema = new mongoose.Schema({
  withdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal',
    required: true,
    unique: true, // Ensure only one payout job per withdrawal request
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending',
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  lastError: {
    type: String,
    default: '',
  },
  runAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

// Compound index for background workers to quickly find jobs to execute
payoutJobSchema.index({ status: 1, runAt: 1 });

const PayoutJob = mongoose.model('PayoutJob', payoutJobSchema);
export default PayoutJob;
