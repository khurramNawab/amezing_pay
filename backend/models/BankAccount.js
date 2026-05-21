import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        accountHolder: {
            type: String,
            required: true,
        },
        bankName: {
            type: String,
            default: '', // Optional for UPI
        },
        accountNumber: {
            type: String,
            default: '', // Optional for UPI
        },
        ifsc: {
            type: String,
            default: '', // Optional for UPI
        },
        upiId: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: ['bank', 'upi'],
            required: true,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Ensure only one primary account per user per type (or overall)
bankAccountSchema.index({ user: 1, isPrimary: 1 }, { unique: true, partialFilterExpression: { isPrimary: true } });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
export default BankAccount;
