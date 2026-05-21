import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    actionType: { type: String, enum: ['install', 'purchase'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    externalOrderId: { type: String, default: '' },
    provider: { type: String, default: 'internal' },
    providerPaymentId: { type: String, default: '' },
    deviceId: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    referralTrackingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralTracking', default: null },
    level1ReferrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level2ReferrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    attributedAt: { type: Date, default: null },
    validatedAt: { type: Date, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

orderSchema.index(
  { actionType: 1, externalOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalOrderId: { $type: 'string', $ne: '' } },
  },
);
orderSchema.index(
  { saleId: 1 },
  { unique: true, partialFilterExpression: { saleId: { $type: 'objectId' } } },
);
orderSchema.index(
  { actionType: 1, deviceId: 1, productId: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { actionType: 'install', deviceId: { $type: 'string', $ne: '' } },
  },
);
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
