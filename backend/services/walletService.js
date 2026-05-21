import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import {
  ACTIVE_PENDING_STATUSES,
  SUCCESS_STATUSES,
  createLedgerEntry,
  money,
} from './transactionService.js';

const WALLET_LAYERS = ['main', 'reward', 'pending'];

const toSigned = (direction, amount) => (direction === 'debit' ? -Math.abs(amount) : Math.abs(amount));

export const ensureUserWallets = async (userId, session = null) => {
  await Promise.all(
    WALLET_LAYERS.map((layer) =>
      Wallet.updateOne(
        { user: userId, layer },
        { $setOnInsert: { user: userId, layer, currency: 'INR', isActive: true, balance: 0 } },
        { upsert: true, session },
      ),
    ),
  );
};

// sumByLayer is deprecated. Use direct Wallet balance.

export const getWalletBalances = async (userId, session = null) => {
  await ensureUserWallets(userId, session);

  let wallets;
  if (session) {
    wallets = await Wallet.find({ user: userId }).session(session);
  } else {
    wallets = await Wallet.find({ user: userId });
  }

  let main = 0, reward = 0, pending = 0;
  for (const w of wallets) {
    if (w.layer === 'main') main = w.balance;
    if (w.layer === 'reward') reward = w.balance;
    if (w.layer === 'pending') pending = w.balance;
  }

  return {
    main: Math.max(0, money(main)),
    reward: Math.max(0, money(reward)),
    pending: Math.max(0, money(pending)),
    withdrawable: Math.max(0, money(main)),
  };
};

export const getLifetimeEarnings = async (userId, session = null) => {
  const query = Transaction.aggregate([
    {
      $match: {
        user: userId,
        status: { $in: SUCCESS_STATUSES },
        direction: 'credit',
        source: {
          $in: [
            'task',
            'quiz',
            'spin',
            'ad',
            'referral',
            'commission',
            'install',
            'purchase_commission',
            'signup_bonus',
            'admin_adjustment',
            'internal',
            'settlement',
          ],
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  if (session) query.session(session);
  const agg = await query;
  return money(agg?.[0]?.total ?? 0);
};

export const getWithdrawnTotal = async (userId, session = null) => {
  const query = Transaction.aggregate([
    {
      $match: {
        user: userId,
        source: 'withdrawal',
        direction: 'debit',
        status: { $in: SUCCESS_STATUSES },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  if (session) query.session(session);
  const agg = await query;
  return money(agg?.[0]?.total ?? 0);
};

export const assertSufficientMainBalance = async ({ userId, amount, session }) => {
  const balances = await getWalletBalances(userId, session);
  if (balances.main < money(amount)) {
    const err = new Error('Insufficient main wallet balance');
    err.statusCode = 400;
    throw err;
  }
};

export const transferBetweenWallets = async ({
  userId,
  amount,
  fromWallet,
  toWallet,
  source = 'settlement',
  title = 'Wallet Transfer',
  status = 'success',
  meta = {},
  baseIdempotencyKey,
  session,
}) => {
  const amt = money(amount);
  if (!(amt > 0)) throw new Error('Transfer amount should be greater than 0');
  if (fromWallet === toWallet) throw new Error('Source and destination wallet cannot be same');

  const debitTx = await createLedgerEntry({
    user: userId,
    wallet: fromWallet,
    direction: 'debit',
    source,
    status,
    amount: amt,
    title,
    meta,
    idempotencyKey: baseIdempotencyKey ? `${baseIdempotencyKey}:debit` : '',
    referenceType: 'wallet_transfer',
  }, { session });

  const creditTx = await createLedgerEntry({
    user: userId,
    wallet: toWallet,
    direction: 'credit',
    source,
    status,
    amount: amt,
    title,
    meta: { ...meta, relatedTransactionId: String(debitTx._id) },
    idempotencyKey: baseIdempotencyKey ? `${baseIdempotencyKey}:credit` : '',
    referenceType: 'wallet_transfer',
    relatedTransaction: debitTx._id,
  }, { session });

  if (!debitTx.relatedTransaction) {
    await Transaction.updateOne(
      { _id: debitTx._id },
      { $set: { relatedTransaction: creditTx._id } },
      { session }
    );
  }

  return { debitTx, creditTx };
};

export const buildWalletSummary = async (userId, session = null) => {
  const [balances, totalLifetime, withdrawn] = await Promise.all([
    getWalletBalances(userId, session),
    getLifetimeEarnings(userId, session),
    getWithdrawnTotal(userId, session),
  ]);

  return {
    walletBalance: balances.main,
    availableBalance: balances.main,
    rewardBalance: balances.reward,
    pendingBalance: balances.pending,
    withdrawableBalance: balances.withdrawable,
    totalEarnings: totalLifetime,
    withdrawn,
  };
};

export const projectBalanceAfterSignedEntry = ({ balance, direction, amount }) =>
  money(Number(balance ?? 0) + toSigned(direction, amount));
