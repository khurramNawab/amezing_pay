import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';

export const SUCCESS_STATUSES = ['success', 'completed'];
export const ACTIVE_PENDING_STATUSES = ['pending'];

export const money = (n) => {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
};

export const asStatus = (status) => {
  if (status === 'completed') return 'success';
  if (status === 'pending' || status === 'success' || status === 'failed') return status;
  return 'success';
};

export const buildIdempotencyKey = (...parts) =>
  crypto.createHash('sha256').update(parts.map((p) => String(p || '')).join('|')).digest('hex');

const withDefaults = (payload) => {
  const amount = money(payload.amount);
  const direction = payload.direction || (payload.type === 'withdrawal' ? 'debit' : 'credit');
  const type =
    payload.type ||
    (direction === 'debit' && payload.source === 'withdrawal' ? 'withdrawal' : 'income');
  const category =
    payload.category ||
    (payload.source === 'withdrawal'
      ? 'payout'
      : payload.source === 'topup'
        ? 'topup'
        : payload.source === 'commission'
          ? 'commission'
          : payload.source === 'referral'
            ? 'referral'
            : 'internal');

  return {
    ...payload,
    amount,
    direction,
    type,
    category,
    status: asStatus(payload.status),
    title: payload.title || 'Ledger Entry',
    wallet: payload.wallet || 'main',
  };
};

export const createLedgerEntry = async (payload, { session } = {}) => {
  const doc = withDefaults(payload);
  if (!(doc.amount > 0)) {
    throw new Error('Ledger amount must be greater than 0');
  }

  if (doc.idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey: doc.idempotencyKey }).session(session);
    if (existing) return existing;
  }

  try {
    const incAmount = doc.direction === 'debit' ? -doc.amount : doc.amount;
    
    // Update the physical Wallet document
    let walletDoc;
    const query = { user: doc.user, layer: doc.wallet };
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    if (incAmount < 0) {
      // Concurrency protection: atomic balance check inside the query itself
      query.balance = { $gte: Math.abs(incAmount) };
    } else {
      // For credit operations, enable upsert to create wallet if missing
      options.upsert = true;
    }

    const updateObj = { $inc: { balance: incAmount } };
    if (options.upsert) {
      updateObj.$setOnInsert = {
        currency: 'INR',
        isActive: true,
        user: doc.user,
        layer: doc.wallet
      };
    }

    walletDoc = await Wallet.findOneAndUpdate(query, updateObj, options);

    if (!walletDoc) {
      const err = new Error('Insufficient balance or wallet not found');
      err.statusCode = 400;
      throw err;
    }
    
    doc.balanceAfter = walletDoc.balance;

    const createdArray = await Transaction.create([doc], { session });
    return createdArray[0];
  } catch (error) {
    if (String(error?.code) === '11000' && doc.idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey: doc.idempotencyKey }).session(session);
      if (existing) return existing;
    }
    throw error;
  }
};

export const markLedgerStatus = async ({ transactionId, status, patch = {}, session }) => {
  return await Transaction.findByIdAndUpdate(
    transactionId,
    { $set: { status: asStatus(status), ...patch } },
    { new: true, session },
  );
};
