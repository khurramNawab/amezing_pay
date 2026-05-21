import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        styleType: {
            type: String,
            required: true,
        },
        isPremium: {
            type: Boolean,
            default: false,
        },
        category: {
            type: String,
            enum: ['business', 'personal', 'premium', 'other'],
            default: 'business',
        },
        priceInr: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        thumbnailUrl: {
            type: String, // URL to preview image (maybe Cloudinary or static asset name)
            default: '',
        },
        layoutConfig: {
            type: Object, // Could store specific colors, fonts, or position configurations if dynamic
            default: {},
        },
    },
    { timestamps: true }
);

const Template = mongoose.model('Template', templateSchema);
export default Template;
