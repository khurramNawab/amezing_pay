import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    count: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index to automatically delete expired records
    }
}, { timestamps: true });

const FraudRateLimit = mongoose.model('FraudRateLimit', rateLimitSchema);
export default FraudRateLimit;
