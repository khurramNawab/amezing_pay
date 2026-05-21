import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    wallet: {
        type: String,
        enum: ['main', 'reward', 'pending'],
        default: 'main',
    },
    direction: {
        type: String,
        enum: ['credit', 'debit'],
        default: 'credit',
    },
    source: {
        type: String,
        enum: [
            'task',
            'quiz',
            'spin',
            'ad',
            'referral',
            'commission',
            'install',
            'purchase',
            'purchase_commission',
            'topup',
            'withdrawal',
            'withdrawal_reversal',
            'settlement',
            'signup_bonus',
            'admin_adjustment',
            'internal',
        ],
        default: 'internal',
    },
    idempotencyKey: {
        type: String,
        default: '',
    },
    referenceId: {
        type: String,
        default: '',
    },
    referenceType: {
        type: String,
        default: '',
    },
    relatedTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null,
    },
    provider: {
        type: String, // razorpay/stripe/manual/etc.
        default: '',
    },
    providerOrderId: {
        type: String,
        default: '',
    },
    providerPaymentId: {
        type: String,
        default: '',
    },
    meta: {
        type: Object,
        default: {},
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null,
    },
    commissionLevel: {
        type: String, // '' | 'seller' | 'upline'
        enum: ['', 'seller', 'upline', 'level1', 'level2'],
        default: '',
    },
    percentage: {
        type: Number,
        default: null,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    balanceAfter: {
        type: Number,
        default: 0,
    },
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String, // 'income' | 'withdrawal' | 'transfer' | 'adjustment'
        required: true,
    },
    category: {
        type: String, // 'commission' | 'referral' | 'internal' | 'bonus' | 'topup' | 'payout'
        required: true,
    },
    status: {
        type: String, // 'pending' | 'processing' | 'success' | 'failed' | 'completed(legacy)'
        enum: ['pending', 'processing', 'success', 'failed', 'completed'],
        default: 'success',
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

transactionSchema.pre('validate', function () {
    if (!this.direction) {
        this.direction = this.type === 'withdrawal' ? 'debit' : 'credit';
    }
    if (!this.wallet) {
        this.wallet = this.type === 'withdrawal' ? 'main' : 'main';
    }
    if (this.status === 'completed') {
        this.status = 'success';
    }
});
// Prevent duplicate commission payouts for the same sale+level
transactionSchema.index(
    { sale: 1, commissionLevel: 1, user: 1 },
    {
        unique: true,
        partialFilterExpression: { sale: { $type: 'objectId' }, commissionLevel: { $in: ['seller', 'upline'] } },
    },
);

// Prevent duplicate provider credits
transactionSchema.index(
    { provider: 1, providerPaymentId: 1 },
    {
        unique: true,
        partialFilterExpression: { providerPaymentId: { $type: 'string', $ne: '' } },
    },
);

transactionSchema.index(
    { idempotencyKey: 1 },
    {
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: 'string', $ne: '' } },
    },
);
transactionSchema.index({ user: 1, wallet: 1, status: 1, createdAt: -1 });
transactionSchema.index({ user: 1, source: 1, createdAt: -1 });
transactionSchema.index({ referenceType: 1, referenceId: 1 });
transactionSchema.index({ user: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
