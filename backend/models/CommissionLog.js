import mongoose from 'mongoose';

const commissionLogSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: String, enum: ['seller', 'upline'], required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    baseAmount: { type: Number, required: true },
    percentage: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

commissionLogSchema.index({ saleId: 1, level: 1 }, { unique: true });

const CommissionLog = mongoose.model('CommissionLog', commissionLogSchema);
export default CommissionLog;

