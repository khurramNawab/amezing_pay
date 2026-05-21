import mongoose from 'mongoose';

const commissionRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    level: { type: String, enum: ['level1', 'level2', 'seller', 'upline'], required: true },
    rateType: { type: String, enum: ['fixed', 'percentage'], required: true },
    rateValue: { type: Number, required: true },
    baseAmount: { type: Number, required: true },
    amount: { type: Number, required: true },
    source: { type: String, enum: ['install', 'purchase'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'failed'],
      default: 'pending',
    },
    pendingTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    settlementTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

commissionRecordSchema.index({ orderId: 1, level: 1 }, { unique: true });
commissionRecordSchema.index({ user: 1, status: 1, createdAt: -1 });

const CommissionRecord = mongoose.model('CommissionRecord', commissionRecordSchema);
export default CommissionRecord;

