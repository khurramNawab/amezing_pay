import BankAccount from '../models/BankAccount.js';

/**
 * @desc    Add a new bank account or UPI ID
 * @route   POST /api/wallet/bank-accounts
 * @access  Private
 */
export const addBankAccount = async (req, res) => {
    try {
        const { type, accountHolder, bankName, accountNumber, ifsc, upiId, isPrimary } = req.body;

        if (!type || !accountHolder) {
            return res.status(400).json({ message: 'Type and Account Holder are required' });
        }

        if (type === 'bank' && (!accountNumber || !ifsc)) {
            return res.status(400).json({ message: 'Account number and IFSC are required for bank accounts' });
        }

        if (type === 'upi' && !upiId) {
            return res.status(400).json({ message: 'UPI ID is required for UPI type' });
        }

        // If this is set as primary, unset other primary accounts for this user
        if (isPrimary) {
            await BankAccount.updateMany({ user: req.user._id }, { isPrimary: false });
        }

        const bankAccount = await BankAccount.create({
            user: req.user._id,
            type,
            accountHolder,
            bankName,
            accountNumber,
            ifsc,
            upiId,
            isPrimary: isPrimary || false,
        });

        res.status(201).json(bankAccount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all bank accounts for a user
 * @route   GET /api/wallet/bank-accounts
 * @access  Private
 */
export const getBankAccounts = async (req, res) => {
    try {
        const accounts = await BankAccount.find({ user: req.user._id }).sort({ isPrimary: -1, createdAt: -1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a bank account
 * @route   DELETE /api/wallet/bank-accounts/:id
 * @access  Private
 */
export const deleteBankAccount = async (req, res) => {
    try {
        const account = await BankAccount.findOne({ _id: req.params.id, user: req.user._id });

        if (!account) {
            return res.status(404).json({ message: 'Bank account not found' });
        }

        await account.deleteOne();
        res.json({ message: 'Bank account removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Set a bank account as primary
 * @route   PATCH /api/wallet/bank-accounts/:id/primary
 * @access  Private
 */
export const setPrimaryBankAccount = async (req, res) => {
    try {
        const account = await BankAccount.findOne({ _id: req.params.id, user: req.user._id });

        if (!account) {
            return res.status(404).json({ message: 'Bank account not found' });
        }

        await BankAccount.updateMany({ user: req.user._id }, { isPrimary: false });
        account.isPrimary = true;
        await account.save();

        res.json(account);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
