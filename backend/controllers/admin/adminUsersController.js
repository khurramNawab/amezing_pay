import User from '../../models/User.js';
import Card from '../../models/Card.js';
import Referral from '../../models/Referral.js';
import Transaction from '../../models/Transaction.js';
import { SUCCESS_STATUSES } from '../../services/transactionService.js';

const parseIntSafe = (v, def) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : def;
};

export const listUsers = async (req, res) => {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 20)));
  const skip = (page - 1) * limit;

  const match = { role: 'user' };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(match),
    User.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  const ids = users.map((u) => u._id);
  const [cardsAgg, refsAgg, walletAgg, earningsAgg] = await Promise.all([
    Card.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
    Referral.aggregate([{ $match: { referrerId: { $in: ids } } }, { $group: { _id: '$referrerId', count: { $sum: 1 } } }]),
    Transaction.aggregate([
      { $match: { user: { $in: ids }, wallet: 'main', status: { $in: SUCCESS_STATUSES } } },
      {
        $group: {
          _id: '$user',
          total: {
            $sum: {
              $cond: [{ $eq: ['$direction', 'debit'] }, { $multiply: ['$amount', -1] }, '$amount'],
            },
          },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: { $in: ids },
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
            ],
          },
        },
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } },
    ]),
  ]);

  const cardMap = new Map(cardsAgg.map((x) => [String(x._id), x.count]));
  const refMap = new Map(refsAgg.map((x) => [String(x._id), x.count]));
  const walletMap = new Map(walletAgg.map((x) => [String(x._id), Number(x.total ?? 0)]));
  const earningsMap = new Map(earningsAgg.map((x) => [String(x._id), Number(x.total ?? 0)]));

  return res.json({
    items: users.map((u) => ({
      _id: u._id,
      name: u.name || '',
      phone: u.phone,
      email: u.email || '',
      role: u.role,
      isBlocked: !!u.isBlocked,
      commission: {
        enabled: u.commission?.enabled !== false,
        sellerPercent: u.commission?.sellerPercent ?? null,
        uplinePercent: u.commission?.uplinePercent ?? null,
      },
      referralCode: u.referralCode,
      walletBalance: Number(walletMap.get(String(u._id)) ?? 0),
      totalEarnings: Number(earningsMap.get(String(u._id)) ?? 0),
      kycStatus: u.kycStatus || 'unverified',
      kycDocuments: u.kycDocuments || [],
      kycRejectionReason: u.kycRejectionReason || null,
      cardsCreated: Number(cardMap.get(String(u._id)) ?? 0),
      referralsCount: Number(refMap.get(String(u._id)) ?? 0),
      createdAt: u.createdAt,
    })),
    page,
    limit,
    total,
  });
};

export const setUserBlocked = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot block admin via this endpoint' });

  const { isBlocked } = req.body || {};
  user.isBlocked = !!isBlocked;
  await user.save();
  return res.json({ _id: user._id, isBlocked: user.isBlocked });
};

export const setUserCommissionOverride = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ message: 'Not supported for admin accounts' });

  const { enabled, sellerPercent, uplinePercent } = req.body || {};
  const clamp = (n) => Math.min(Math.max(Number(n), 0), 100);

  if (!user.commission) user.commission = { enabled: true };
  if (typeof enabled === 'boolean') user.commission.enabled = enabled;

  if (sellerPercent === null) user.commission.sellerPercent = null;
  else if (typeof sellerPercent === 'number') user.commission.sellerPercent = clamp(sellerPercent);

  if (uplinePercent === null) user.commission.uplinePercent = null;
  else if (typeof uplinePercent === 'number') user.commission.uplinePercent = clamp(uplinePercent);

  await user.save();
  return res.json({
    _id: user._id,
    commission: user.commission,
  });
};

export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin via this endpoint' });

  const userId = user._id;
  await Promise.all([
    Card.deleteMany({ user: userId }),
    Transaction.deleteMany({ user: userId }),
    Referral.deleteMany({ $or: [{ referrerId: userId }, { referredUserId: userId }] }),
  ]);
  await user.deleteOne();
  return res.json({ message: 'User deleted' });
};
