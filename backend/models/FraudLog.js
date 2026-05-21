import mongoose from 'mongoose';

const fraudLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['VELOCITY_ABUSE', 'IP_SPOOF', 'DEVICE_SHARING', 'ABNORMAL_EARNING'], required: true },
    metadata: {
        ipAddress: String,
        deviceId: String,
        action: String,
        detail: String
    },
    severity: { type: String, enum: ['low', 'medium', 'critical'], default: 'low' }
}, { timestamps: true });

const FraudLog = mongoose.model('FraudLog', fraudLogSchema);
export default FraudLog;
