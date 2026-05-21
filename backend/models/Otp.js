import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 
    },
    ipAddress: {
        type: String,
        required: true
    },
    metadata: {
        userAgent: String,
        deviceId: String
    }
}, { timestamps: true });

// The TTL index is already created via the 'expires' property in the schema definition.
// Remove duplicate: otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
