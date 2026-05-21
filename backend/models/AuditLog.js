import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    event: {
        type: String,
        required: true,
        enum: ['OTP_REQUEST', 'OTP_VERIFIED', 'OTP_FAILED', 'OTP_SENT', 'OTP_ERROR', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'TOKEN_REFRESH', 'LOGOUT', 'EMAIL_VERIFIED', 'KYC_SUBMITTED']
    },
    status: {
        type: String,
        required: true,
        enum: ['SUCCESS', 'FAILURE']
    },
    ipAddress: String,
    userAgent: String,
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

// TTL index to automatically remove logs older than 90 days for performance/compliance
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
