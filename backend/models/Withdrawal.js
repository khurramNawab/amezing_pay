import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 }, // Total requested/debited amount
    feeAmount: { type: Number, default: 0 }, // Platform fee deducted
    payoutAmount: { type: Number, default: 0 }, // Actual amount to be sent to user
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'DISPATCHED_TO_BANK', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    method: { type: String, enum: ['upi', 'bank', 'wallet'], default: 'upi' },
    provider: { type: String, enum: ['manual', 'razorpay', 'cashfree'], default: 'manual' },
    destination: {
      upiId: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumberMasked: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    providerPayoutId: { type: String, default: '' },
    fundAccountId: { type: String, default: '' },
    utr: { type: String, default: '' },
    idempotencyKey: { type: String, default: '' },
    initiationTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    reversalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    failureReason: { type: String, default: '' },
    adminNote: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

withdrawalSchema.index({ user: 1, status: 1, createdAt: -1 });
withdrawalSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string', $ne: '' } } },
);

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
export default Withdrawal;

