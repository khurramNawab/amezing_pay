import Transaction from '../../models/Transaction.js';
import CommissionRecord from '../../models/CommissionRecord.js';
import { markLedgerStatus } from '../../services/transactionService.js';
import { transferBetweenWallets } from '../../services/walletService.js';
import { logger } from '../../services/logger.js';

const parseIntSafe = (v, def) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : def;
};

export const listTransactions = async (req, res) => {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 20)));
  const skip = (page - 1) * limit;

  const query = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: rx }, { category: rx }, { type: rx }, { status: rx }, { source: rx }, { wallet: rx }];
  }

  const [total, items] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name phone'),
  ]);

  return res.json({
    items: items.map((t) => ({
      _id: t._id,
      user: t.user,
      amount: t.amount,
      title: t.title,
      type: t.type,
      category: t.category,
      status: t.status,
      wallet: t.wallet,
      direction: t.direction,
      source: t.source,
      createdAt: t.createdAt,
    })),
    page,
    limit,
    total,
  });
};

export const approvePendingTransaction = async (req, res) => {
  try {
    logger.info('[Admin] Approving transaction', { transactionId: req.params.id });
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Only pending transactions can be approved' });
    if (tx.wallet !== 'pending' || tx.direction !== 'credit') {
      return res.status(400).json({ message: 'Transaction is not an approvable pending credit' });
    }

    await markLedgerStatus({
      transactionId: tx._id,
      status: 'success',
      patch: { meta: { ...(tx.meta || {}), approvedBy: req.user?._id, approvedAt: new Date() } },
    });

    const settled = await transferBetweenWallets({
      userId: tx.user,
      amount: tx.amount,
      fromWallet: 'pending',
      toWallet: 'main',
      source: 'settlement',
      title: `Settlement: ${tx.title}`,
      status: 'success',
      meta: { sourceTransactionId: String(tx._id), source: tx.source },
      baseIdempotencyKey: `admin:settle:${tx._id}`,
    });

    if (tx.source === 'commission') {
      await CommissionRecord.updateOne(
        { pendingTransactionId: tx._id },
        {
          $set: {
            status: 'approved',
            settlementTransactionId: settled.creditTx._id,
          },
        },
      );
    }

    logger.info('[Admin] Successfully approved & settled', { transactionId: String(tx._id) });
    return res.json({
      message: 'Transaction approved and settled to main wallet',
      transactionId: tx._id,
      settlementTransactionId: settled.creditTx._id,
    });
  } catch (error) {
    logger.error('[Admin] Approval failed', { transactionId: req.params.id, message: error?.message, stack: error?.stack });
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const rejectPendingTransaction = async (req, res) => {
  try {
    logger.info('[Admin] Rejecting transaction', { transactionId: req.params.id });
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Only pending transactions can be rejected' });
    if (tx.wallet !== 'pending' || tx.direction !== 'credit') {
      return res.status(400).json({ message: 'Transaction is not an approvable pending credit' });
    }

    await markLedgerStatus({
      transactionId: tx._id,
      status: 'failed',
      patch: {
        meta: {
          ...(tx.meta || {}),
          rejectedBy: req.user?._id,
          rejectedAt: new Date(),
          rejectionReason: String(req.body?.reason || '').trim(),
        },
      },
    });

    if (tx.source === 'commission') {
      await CommissionRecord.updateOne(
        { pendingTransactionId: tx._id },
        { $set: { status: 'rejected' } },
      );
    }

    logger.info('[Admin] Successfully rejected', { transactionId: String(tx._id) });
    return res.json({ message: 'Pending transaction rejected', transactionId: tx._id });
  } catch (error) {
    logger.error('[Admin] Rejection failed', { transactionId: req.params.id, message: error?.message, stack: error?.stack });
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};
