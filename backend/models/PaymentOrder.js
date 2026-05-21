import mongoose from 'mongoose';

const paymentOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, default: 'razorpay' },
    purpose: { type: String, enum: ['wallet_topup', 'purchase_checkout'], required: true },
    amount: { type: Number, required: true }, // INR
    currency: { type: String, default: 'INR' },
    orderId: { type: String, required: true },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    paymentId: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

paymentOrderSchema.index({ provider: 1, orderId: 1 }, { unique: true });
paymentOrderSchema.index(
  { provider: 1, paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: 'string', $ne: '' } } }
);

const PaymentOrder = mongoose.model('PaymentOrder', paymentOrderSchema);
export default PaymentOrder;
