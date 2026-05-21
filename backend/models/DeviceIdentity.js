import mongoose from 'mongoose';

const deviceIdentitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    isFlagged: { type: Boolean, default: false },
    riskReason: { type: String, default: '' },
  },
  { timestamps: true },
);

deviceIdentitySchema.index({ user: 1, deviceId: 1 }, { unique: true });
deviceIdentitySchema.index({ deviceId: 1, lastSeenAt: -1 });

const DeviceIdentity = mongoose.model('DeviceIdentity', deviceIdentitySchema);
export default DeviceIdentity;

