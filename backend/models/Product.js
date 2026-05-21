import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true }, // For internal sales
    commission: { type: String, required: true }, // e.g. "₹85" or "8%"
    originalPrice: { type: Number },
    category: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    imageUrls: { type: [String], default: [] },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assetUrl: { type: String, default: '' }, // For digital delivery
    source: { type: String, enum: ['affiliate', 'internal'], default: 'internal' },
    platformName: { type: String }, // e.g. Amazon, Flipkart
    platformColor: { type: String }, // HEX code
    trustBadge: { type: String }, // e.g. "Verified"
    shareUrl: { type: String, default: '' },
    placements: {
        type: [String],
        enum: ['high_commission', 'digital_store', 'trending_affiliate'],
        default: [],
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
