import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // 'APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL', 'CONFIG_CHANGE'
    targetId: { type: String, default: '' },
    details: { type: Object, default: {} },
    ipAddress: { type: String, default: '' }
}, { timestamps: true });

adminLogSchema.index({ adminId: 1, action: 1, createdAt: -1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);
export default AdminLog;
