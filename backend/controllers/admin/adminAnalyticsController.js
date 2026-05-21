import User from '../../models/User.js';
import Card from '../../models/Card.js';
import Referral from '../../models/Referral.js';
import Transaction from '../../models/Transaction.js';
import AppConfig from '../../models/AppConfig.js';
import { SUCCESS_STATUSES } from '../../services/transactionService.js';

const parseRangeDays = (range) => {
  const s = String(range || '30d').trim().toLowerCase();
  const m = s.match(/^(\d+)\s*d$/);
  if (!m) return 30;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(Math.max(n, 7), 365) : 30;
};

const toYmd = (d) => {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getOverview = async (req, res) => {
  const days = parseRangeDays(req.query.range);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const config = await AppConfig.getSingleton();

  const [totalUsers, cardsCreated, totalReferrals, revenueAgg] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Card.countDocuments({}),
    Referral.countDocuments({}),
    Transaction.aggregate([
      { $match: { status: { $in: SUCCESS_STATUSES }, direction: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalRevenue = revenueAgg?.[0]?.total ?? 0;
  const [sellerAgg, uplineAgg] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          status: { $in: SUCCESS_STATUSES },
          direction: 'credit',
          commissionLevel: 'seller',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          status: { $in: SUCCESS_STATUSES },
          direction: 'credit',
          commissionLevel: 'upline',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  const sellerEarnings = sellerAgg?.[0]?.total ?? 0;
  const uplineEarnings = uplineAgg?.[0]?.total ?? 0;
  const activeUsers = await User.countDocuments({ role: 'user', createdAt: { $gte: since } });
  const successfulReferrals = await Referral.countDocuments({ status: 'successful' });
  const conversionRate = totalReferrals ? (successfulReferrals / totalReferrals) * 100 : 0;

  const daysArr = [];
  for (let i = days - 1; i >= 0; i--) {
    daysArr.push(toYmd(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }

  const [usersSeries, cardsSeries, referralsSeries, revenueSeries] = await Promise.all([
    User.aggregate([
      { $match: { role: 'user', createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Card.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Referral.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: SUCCESS_STATUSES }, direction: 'credit' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' } } },
    ]),
  ]);

  const mapCounts = (arr, key = 'count') => {
    const map = new Map(arr.map((x) => [x._id, x[key]]));
    return daysArr.map((d) => Number(map.get(d) ?? 0));
  };

  const recentTransactions = await Transaction.find({ status: { $in: SUCCESS_STATUSES } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'name phone');

  return res.json({
    totals: {
      totalUsers,
      activeUsers,
      totalRevenue,
      adsRevenue: Number(config.ads?.adsRevenue ?? 0),
      totalReferrals,
      conversionRate,
      cardsCreated,
      sellerEarnings,
      uplineEarnings,
    },
    series: {
      days: daysArr,
      users: mapCounts(usersSeries, 'count'),
      cards: mapCounts(cardsSeries, 'count'),
      referrals: mapCounts(referralsSeries, 'count'),
      revenue: mapCounts(revenueSeries, 'total'),
    },
    recentTransactions: recentTransactions.map((t) => ({
      _id: t._id,
      userName: t.user?.name || '',
      userPhone: t.user?.phone || '',
      title: t.title,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
};
