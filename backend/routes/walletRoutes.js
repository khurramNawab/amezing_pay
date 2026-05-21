import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getWalletSummary,
  listWalletTransactions,
  listMyWithdrawals,
  createWalletTopupOrder,
  verifyWalletTopup,
  walletTopupCheckoutPage,
  verifyWalletTopupPublic,
  razorpayWebhook,
  requestWithdraw,
} from '../controllers/walletController.js';
import {
  addBankAccount,
  getBankAccounts,
  deleteBankAccount,
  setPrimaryBankAccount,
} from '../controllers/bankAccountController.js';
import validate from '../middleware/validatorMiddleware.js';
import { topupOrderSchema, verifyTopupSchema, withdrawSchema, addBankSchema } from '../validations/walletValidation.js';


const router = express.Router();

router.get('/summary', protect, getWalletSummary);
router.get('/transactions', protect, listWalletTransactions);
router.get('/withdrawals', protect, listMyWithdrawals);
router.post('/topup/create-order', protect, validate(topupOrderSchema), createWalletTopupOrder);
router.post('/topup/verify', protect, validate(verifyTopupSchema), verifyWalletTopup);
router.get('/topup/checkout', walletTopupCheckoutPage);
router.post('/topup/verify-public', validate(verifyTopupSchema), verifyWalletTopupPublic);
router.post('/topup/webhook', razorpayWebhook);
router.post('/withdraw', protect, validate(withdrawSchema), requestWithdraw);

// Bank Account Routes
router.get('/bank-accounts', protect, getBankAccounts);
router.post('/bank-accounts', protect, validate(addBankSchema), addBankAccount);

router.delete('/bank-accounts/:id', protect, deleteBankAccount);
router.patch('/bank-accounts/:id/primary', protect, setPrimaryBankAccount);


export default router;

