import mongoose from 'mongoose';

const referralTrackingSchema = new mongoose.Schema(
  {
    clickId: { type: String, required: true, unique: true },
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referralCode: { type: String, default: '' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    deviceId: { type: String, default: '' },
    attributedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    sourcePath: { type: String, default: '' },
    attributionModel: { type: String, enum: ['last_click'], default: 'last_click' },
    clickedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

referralTrackingSchema.index({ deviceId: 1, productId: 1, clickedAt: -1 });
referralTrackingSchema.index({ attributedUserId: 1, clickedAt: -1 });
referralTrackingSchema.index({ referrerId: 1, createdAt: -1 });
referralTrackingSchema.index({ expiresAt: 1 });

const ReferralTracking = mongoose.model('ReferralTracking', referralTrackingSchema);
export default ReferralTracking;

