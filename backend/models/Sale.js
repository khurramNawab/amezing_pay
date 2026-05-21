import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    title: { type: String, default: 'Sale' },
    provider: { type: String, default: '' }, // razorpay/stripe/manual/etc.
    providerPaymentId: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

saleSchema.index(
  { provider: 1, providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerPaymentId: { $type: 'string', $ne: '' } },
  },
);

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
