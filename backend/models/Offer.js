import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    bankName: { type: String, required: true },
    cardName: { type: String, required: true },
    description: { type: String, required: true },
    benefits: [{ type: String }],
    logoUrl: { type: String, required: true },
    affiliateLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
