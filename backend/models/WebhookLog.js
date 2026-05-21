import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema({
    provider: {
        type: String,
        required: true,
        default: 'unknown'
    },
    eventId: {
        type: String,
        unique: true,
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    payload: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['received', 'processed', 'failed', 'duplicate'],
        default: 'received'
    },
    error: String,
    ipAddress: String
}, { timestamps: true });

// TTL for 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);
export default WebhookLog;
