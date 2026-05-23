import mongoose from 'mongoose';
import AppConfig from '../models/AppConfig.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';
import { createLedgerEntry, money } from './transactionService.js';
import { assertSufficientMainBalance, buildWalletSummary } from './walletService.js';
import { checkRateLimit } from './fraudService.js';

const ensureWithdrawalEnabled = async (amount) => {
  const config = await AppConfig.getSingleton();
  const enabled = config?.payouts?.enabled !== false;
  const min = money(config?.payouts?.minWithdrawAmount ?? 0);

  if (!enabled) {
    const err = new Error('Withdrawals are disabled');
    err.statusCode = 400;
    throw err;
  }
  if (amount < min) {
    const err = new Error(`Minimum withdrawal amount is ₹${min}`);
    err.statusCode = 400;
    throw err;
  }

  return config;
};

export const requestWithdrawal = async ({
  userId,
  amount,
  method = 'upi',
  destination = {},
  idempotencyKey = '',
  provider = 'manual',
  meta = {},
}) => {
  const amt = money(amount);
  if (!(amt > 0)) {
    const err = new Error('amount must be greater than 0');
    err.statusCode = 400;
    throw err;
  }

  // Rate Limiter: Max 2 withdrawals per day (86400 seconds)
  await checkRateLimit(userId, 'withdraw', 86400, 2);
  
  // Cooldown Limiter: Max 1 withdrawal per 5 minutes to prevent network spam
  await checkRateLimit(userId, 'withdraw_cooldown', 300, 1);

  const config = await ensureWithdrawalEnabled(amt);
  const feePercent = Number(config?.platformFeePercent ?? 0);
  const feeAmount = money((amt * feePercent) / 100);
  const payoutAmount = money(amt - feeAmount);

  const user = await User.findById(userId).select('kycStatus');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (user.kycStatus !== 'verified') {
    const err = new Error('KYC verification is required before withdrawal');
    err.statusCode = 403;
    throw err;
  }

  const session = await mongoose.startSession();
  
  let withdrawal;
  let summary;

  try {
    await session.withTransaction(async () => {
      await assertSufficientMainBalance({ userId, amount: amt, session });

      const debitTx = await createLedgerEntry({
        user: userId,
        wallet: 'main',
        direction: 'debit',
        source: 'withdrawal',
        status: 'success',
        amount: amt,
        title: `Withdrawal request (${method})`,
        type: 'withdrawal',
        category: 'payout',
        meta: { method, destination, feeAmount, payoutAmount, feePercent, ...meta },
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:debit` : '',
        referenceType: 'withdrawal',
      }, { session });

      withdrawal = await Withdrawal.findOneAndUpdate(
        { initiationTransactionId: debitTx._id },
        {
          $setOnInsert: {
            user: userId,
            amount: amt,
            feeAmount,
            payoutAmount,
            currency: 'INR',
            status: 'PENDING',
            method,
            provider,
            destination,
            idempotencyKey,
            initiationTransactionId: debitTx._id,
            meta,
          },
        },
        { returnDocument: 'after', upsert: true, session },
      );

      summary = await buildWalletSummary(userId, session);
    });
  } finally {
    session.endSession();
  }

  return { withdrawal, summary };
};

export const setWithdrawalProcessing = async ({ withdrawalId, adminId = null }, { session } = {}) => {
  const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
  if (!withdrawal) {
    const err = new Error('Withdrawal not found');
    err.statusCode = 404;
    throw err;
  }
  if (withdrawal.status !== 'PENDING') return withdrawal;
  withdrawal.status = 'PROCESSING';
  withdrawal.processedBy = adminId || null;
  await withdrawal.save({ session });
  return withdrawal;
};

export const markWithdrawalSuccess = async ({
  withdrawalId,
  adminId = null,
  providerPayoutId = '',
  note = '',
}, { session } = {}) => {
  const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
  if (!withdrawal) {
    const err = new Error('Withdrawal not found');
    err.statusCode = 404;
    throw err;
  }
  if (withdrawal.status === 'SUCCESS') return withdrawal;
  if (withdrawal.status === 'FAILED') {
    const err = new Error('Cannot mark failed withdrawal as success');
    err.statusCode = 400;
    throw err;
  }

  withdrawal.status = 'SUCCESS';
  if (adminId) withdrawal.approvedBy = adminId;
  withdrawal.processedBy = adminId || withdrawal.processedBy;
  withdrawal.providerPayoutId = String(providerPayoutId || '').trim();
  withdrawal.adminNote = note || withdrawal.adminNote;
  await withdrawal.save({ session });
  return withdrawal;
};

export const markWithdrawalFailed = async ({
  withdrawalId,
  adminId = null,
  reason = '',
  note = '',
}, { session: externalSession } = {}) => {
  const session = externalSession || (await mongoose.startSession());
  let withdrawal;
  try {
    const execute = async (sess) => {
      withdrawal = await Withdrawal.findById(withdrawalId).session(sess);
      if (!withdrawal) {
        const err = new Error('Withdrawal not found');
        err.statusCode = 404;
        throw err;
      }
      if (withdrawal.status === 'FAILED') return;
      if (withdrawal.status === 'SUCCESS') {
        const err = new Error('Cannot fail a successful withdrawal');
        err.statusCode = 400;
        throw err;
      }

      const reversalTx =
        withdrawal.reversalTransactionId
          ? await Transaction.findById(withdrawal.reversalTransactionId).session(sess)
          : await createLedgerEntry({
              user: withdrawal.user,
              wallet: 'main',
              direction: 'credit',
              source: 'withdrawal_reversal',
              status: 'success',
              amount: withdrawal.amount,
              title: 'Withdrawal reversal',
              type: 'income',
              category: 'payout',
              referenceType: 'withdrawal',
              referenceId: String(withdrawal._id),
              idempotencyKey: `withdrawal:${withdrawal._id}:reversal`,
              meta: { reason },
            }, { session: sess });

      withdrawal.status = 'FAILED';
      withdrawal.failureReason = reason;
      withdrawal.adminNote = note || withdrawal.adminNote;
      withdrawal.reversalTransactionId = reversalTx?._id || withdrawal.reversalTransactionId;
      if (adminId) withdrawal.processedBy = adminId;
      await withdrawal.save({ session: sess });
    };

    if (externalSession) {
      await execute(externalSession);
    } else {
      await session.withTransaction(() => execute(session));
    }
  } finally {
    if (!externalSession) {
      session.endSession();
    }
  }
  return withdrawal;
};
