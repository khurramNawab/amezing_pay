import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    name: {
        type: String,
        default: '',
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        default: null,
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
    },
    photo: {
        type: String,
        default: '',
    },
    password: {
        type: String,
        default: null,
    },
    referralCode: {
        type: String,
        unique: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    kycStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified',
    },
    kycVerifiedAt: {
        type: Date,
        default: null,
    },
    walletBalance: {
        // Legacy snapshot only. Authoritative balances are derived from Transaction ledger.
        type: Number,
        default: 0,
    },
    totalEarnings: {
        // Legacy snapshot only. Authoritative earnings are derived from Transaction ledger.
        type: Number,
        default: 0,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'under_review', 'blocked'],
        default: 'active',
    },
    riskScore: {
        type: Number,
        default: 0,
    },
    adminRole: {
        type: String,
        enum: ['super_admin', 'sub_admin'],
        default: 'sub_admin',
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    commission: {
        enabled: { type: Boolean, default: true },
        // Overrides (null/undefined means use global settings)
        sellerPercent: { type: Number, default: null },
        uplinePercent: { type: Number, default: null },
    },
    fraudFlags: {
        multipleAccountsDevice: { type: Boolean, default: false },
        duplicateIpRisk: { type: Boolean, default: false },
    },
    kycDocuments: [{
        docType: { type: String, enum: ['aadhar_front', 'aadhar_back', 'pan_card', 'selfie'] },
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    kycRejectionReason: {
        type: String,
        default: null
    },
    proCardAccessGrantedAt: {
        type: Date,
        default: null,
    },
    proCardAccessExpiresAt: {
        type: Date,
        default: null,
    },
    proCardAccessSource: {
        type: String,
        default: '',
    },
    proCardMysteryLastClaimedDay: {
        type: String,
        default: '',
    },
    passwordResetToken: {
        type: String,
        default: null,
    },
    passwordResetExpires: {
        type: Date,
        default: null,
    },
    refreshToken: {
        type: String,
        default: null
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Performance indexes for admin dashboard queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
export default User;
