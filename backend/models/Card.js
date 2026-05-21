import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        template: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Template',
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        role: {
            type: String, // E.g. Business Role / Title
            required: true,
            trim: true,
        },
        address: {
            type: String,
            default: '',
        },
        profileImage: {
            type: String, // Cloudinary URL
            default: '',
        },
        companyName: {
            type: String,
            default: '',
        },

        // Business Digital Profile (backward-compatible extension)
        businessInfo: {
            name: { type: String, default: '' },        // Business Name
            category: { type: String, default: '' },    // Retail, Service, Freelancer, etc.
            address: { type: String, default: '' },
            description: { type: String, default: '' }, // Short bio
        },
        payment: {
            upiId: { type: String, default: '' },
            qrImageUrl: { type: String, default: '' }, // Optional (client can also auto-generate)
        },
        socialLinks: {
            linkedin: { type: String, default: '' },
            twitter: { type: String, default: '' },
            website: { type: String, default: '' },
            instagram: { type: String, default: '' },
            whatsapp: { type: String, default: '' },
            youtube: { type: String, default: '' },
        },
        products: [
            {
                imageUrl: { type: String, required: true },
                title: { type: String, default: '' },
            },
        ],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'approved',
        },
        stats: {
            views: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

const Card = mongoose.model('Card', cardSchema);
export default Card;
