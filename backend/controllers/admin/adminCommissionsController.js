import Transaction from '../../models/Transaction.js';
import Referral from '../../models/Referral.js';
import User from '../../models/User.js';
import { SUCCESS_STATUSES } from '../../services/transactionService.js';

const parseRangeDays = (range) => {
  const s = String(range || '30d').trim().toLowerCase();
  const m = s.match(/^(\d+)\s*d$/);
  if (!m) return 30;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(Math.max(n, 7), 365) : 30;
};

export const getLeaderboard = async (req, res) => {
  const days = parseRangeDays(req.query.range);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [topSellersAgg, topUplinesAgg, topReferrersAgg] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: SUCCESS_STATUSES },
          direction: 'credit',
          commissionLevel: { $in: ['seller', 'level1'] },
        },
      },
      { $group: { _id: '$user', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: limit },
    ]),
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: SUCCESS_STATUSES },
          direction: 'credit',
          commissionLevel: { $in: ['upline', 'level2'] },
        },
      },
      { $group: { _id: '$user', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: limit },
    ]),
    Referral.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$referrerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]),
  ]);

  const sellerIds = topSellersAgg.map((x) => x._id);
  const uplineIds = topUplinesAgg.map((x) => x._id);
  const refIds = topReferrersAgg.map((x) => x._id);

  const [sellerUsers, uplineUsers, refUsers] = await Promise.all([
    User.find({ _id: { $in: sellerIds } }).select('name phone'),
    User.find({ _id: { $in: uplineIds } }).select('name phone'),
    User.find({ _id: { $in: refIds } }).select('name phone'),
  ]);

  const mapUser = (arr) => new Map(arr.map((u) => [String(u._id), { _id: u._id, name: u.name || '', phone: u.phone }]));
  const sellerMap = mapUser(sellerUsers);
  const uplineMap = mapUser(uplineUsers);
  const refMap = mapUser(refUsers);

  return res.json({
    rangeDays: days,
    topSellers: topSellersAgg.map((x) => ({
      user: sellerMap.get(String(x._id)) || { _id: x._id, name: '', phone: '' },
      total: Number(x.total ?? 0),
      count: Number(x.count ?? 0),
    })),
    topUplines: topUplinesAgg.map((x) => ({
      user: uplineMap.get(String(x._id)) || { _id: x._id, name: '', phone: '' },
      total: Number(x.total ?? 0),
      count: Number(x.count ?? 0),
    })),
    topReferrers: topReferrersAgg.map((x) => ({
      user: refMap.get(String(x._id)) || { _id: x._id, name: '', phone: '' },
      count: Number(x.count ?? 0),
    })),
  });
};
