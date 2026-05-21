import Transaction from '../models/Transaction.js';
import { SUCCESS_STATUSES } from '../services/transactionService.js';
import { buildWalletSummary } from '../services/walletService.js';
import { reconcilePendingTaskRewards } from '../services/rewardEngine.js';

const inr = (n) => `INR ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const startDateDaysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const getEarningsSummary = async (req, res) => {
  try {
    await reconcilePendingTaskRewards(req.user._id).catch(() => {});
    const [summary, txs] = await Promise.all([
      buildWalletSummary(req.user._id),
      Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(500),
    ]);

    const successTx = txs.filter((t) => SUCCESS_STATUSES.includes(t.status));
    const pendingTx = txs.filter((t) => t.status === 'pending');
    const thisMonthSince = startDateDaysAgo(30);

    const thisMonth = successTx
      .filter((t) => t.direction === 'credit' && t.createdAt >= thisMonthSince)
      .reduce((acc, t) => acc + Number(t.amount ?? 0), 0);

    const pending = pendingTx
      .filter((t) => t.direction === 'credit')
      .reduce((acc, t) => acc + Number(t.amount ?? 0), 0);

    const internalEarnings = successTx
      .filter((t) => ['task', 'quiz', 'spin', 'ad', 'internal', 'settlement'].includes(t.source))
      .reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
    const affiliateEarnings = successTx
      .filter((t) => ['commission', 'purchase_commission'].includes(t.source))
      .reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
    const referralEarnings = successTx
      .filter((t) => ['referral', 'install'].includes(t.source))
      .reduce((acc, t) => acc + Number(t.amount ?? 0), 0);

    return res.json({
      totalLifetime: summary.totalEarnings,
      available: summary.availableBalance,
      rewardBalance: summary.rewardBalance,
      pendingBalance: summary.pendingBalance,
      withdrawn: summary.withdrawn,
      thisMonth,
      pending,
      completedCount: successTx.length,
      pendingCount: pendingTx.length,
      growthPercent: 0,
      internalEarnings,
      affiliateEarnings,
      referralEarnings,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getEarningsBreakdown = async (req, res) => {
  try {
    const txs = await Transaction.find({
      user: req.user._id,
      status: { $in: SUCCESS_STATUSES },
      direction: 'credit',
    }).sort({ createdAt: -1 });

    const groups = new Map();
    for (const tx of txs) {
      const key = tx.source || tx.category || 'internal';
      groups.set(key, Number(groups.get(key) ?? 0) + Number(tx.amount ?? 0));
    }

    const titleFor = (source) => {
      if (['commission', 'purchase_commission'].includes(source)) return 'Purchase Commissions';
      if (['referral', 'install'].includes(source)) return 'Referral Income';
      if (['quiz', 'spin', 'ad', 'task', 'settlement'].includes(source)) return 'Task Rewards';
      if (source === 'topup') return 'Top-ups';
      return 'Other Earnings';
    };

    const breakdown = Array.from(groups.entries()).map(([category, amount], index) => ({
      id: `${category}-${index}`,
      title: titleFor(category),
      amount: inr(amount),
      category,
      rawAmount: Number(amount ?? 0),
    }));

    return res.json(breakdown);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTransactionLogs = async (req, res) => {
  try {
    const txs = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);

    const logs = txs.map((t) => ({
      id: t._id,
      title: t.title,
      amount: `${t.direction === 'debit' ? '-' : '+'}${inr(t.amount)}`,
      date: t.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: t.status,
      wallet: t.wallet,
      source: t.source,
    }));

    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
