import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'successful'], default: 'pending' },
    commissionEarned: { type: Number, default: 0 },
}, { timestamps: true });

referralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
