import CommissionRecord from '../models/CommissionRecord.js';
import Referral from '../models/Referral.js';
import ReferralTracking from '../models/ReferralTracking.js';
import User from '../models/User.js';
import { extractDeviceId, extractIpAddress } from '../services/fraudService.js';
import {
  captureReferralClick,
  generateReferralLink,
  recordAttributedConversion,
} from '../services/referralEngine.js';

const parseProductId = (v) => (v ? String(v).trim() : '');

export const getReferrals = async (req, res) => {
  const referrals = await Referral.find({ referrerId: req.user._id })
    .populate('referredUserId', 'name phone createdAt')
    .sort({ createdAt: -1 });

  const commissions = await CommissionRecord.aggregate([
    {
      $match: {
        user: req.user._id,
        source: { $in: ['install', 'purchase'] },
      },
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map(commissions.map((x) => [String(x._id), x]));

  return res.json({
    items: referrals.map((r) => ({
      _id: r._id,
      referredUserId: r.referredUserId,
      status: r.status,
      commissionEarned: Number(r.commissionEarned ?? 0),
      createdAt: r.createdAt,
    })),
    totals: {
      pendingAmount: Number(map.get('pending')?.total ?? 0),
      approvedAmount: Number(map.get('approved')?.total ?? 0),
      pendingCount: Number(map.get('pending')?.count ?? 0),
      approvedCount: Number(map.get('approved')?.count ?? 0),
    },
  });
};

export const createReferral = async (req, res) => {
  const referredUserId = String(req.body?.referredUserId || '').trim();
  if (!referredUserId) return res.status(400).json({ message: 'referredUserId is required' });
  if (String(referredUserId) === String(req.user._id)) {
    return res.status(400).json({ message: 'Self-referral is not allowed' });
  }

  const referredUser = await User.findById(referredUserId).select('_id');
  if (!referredUser) return res.status(404).json({ message: 'Referred user not found' });

  const referral = await Referral.findOneAndUpdate(
    { referrerId: req.user._id, referredUserId },
    {
      $setOnInsert: {
        referrerId: req.user._id,
        referredUserId,
        status: 'pending',
        commissionEarned: 0,
      },
    },
    { upsert: true, new: true },
  );

  return res.status(201).json(referral);
};

export const getReferralLink = async (req, res) => {
  const productId = parseProductId(req.params.productId || req.query.productId);
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const refValue = req.user.referralCode || String(req.user._id);
  const baseUrl = process.env.APP_BASE_URL || 'https://amezingpay.com';
  const link = generateReferralLink({ productId, refValue, baseUrl });
  return res.json({ link, productId, ref: refValue });
};

export const captureClick = async (req, res) => {
  const ref = String(req.body?.ref || req.query?.ref || '').trim();
  const productId = parseProductId(req.body?.productId || req.query?.productId);
  const sourcePath = String(req.body?.sourcePath || req.query?.sourcePath || '').trim();
  const deviceId = extractDeviceId(req);
  const ipAddress = extractIpAddress(req);
  const userAgent = String(req.headers['user-agent'] || '');

  if (!ref) return res.status(400).json({ message: 'ref is required' });

  const click = await captureReferralClick({
    ref,
    productId: productId || null,
    deviceId,
    ipAddress,
    userAgent,
    sourcePath,
    attributedUserId: req.user?._id || null,
    metadata: { channel: req.body?.channel || '' },
  });

  if (!click) return res.status(404).json({ message: 'Invalid referral' });
  return res.status(201).json({
    clickId: click.clickId,
    referrerId: click.referrerId,
    productId: click.productId,
    expiresAt: click.expiresAt,
  });
};

export const getReferralDashboard = async (req, res) => {
  const [recentClicks, commissions] = await Promise.all([
    ReferralTracking.find({ referrerId: req.user._id }).sort({ createdAt: -1 }).limit(20),
    CommissionRecord.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
  ]);

  const byLevel = commissions.reduce(
    (acc, row) => {
      acc.total += Number(row.amount ?? 0);
      if (row.level === 'level1' || row.level === 'seller') acc.level1 += Number(row.amount ?? 0);
      if (row.level === 'level2' || row.level === 'upline') acc.level2 += Number(row.amount ?? 0);
      if (row.status === 'pending') acc.pending += Number(row.amount ?? 0);
      if (row.status === 'approved') acc.approved += Number(row.amount ?? 0);
      return acc;
    },
    { total: 0, level1: 0, level2: 0, pending: 0, approved: 0 },
  );

  return res.json({
    totals: byLevel,
    referralCount: recentClicks.length,
    recentClicks: recentClicks.map((r) => ({
      clickId: r.clickId,
      productId: r.productId,
      attributedUserId: r.attributedUserId,
      clickedAt: r.clickedAt,
      expiresAt: r.expiresAt,
      isActive: r.isActive,
    })),
    recentCommissions: commissions.map((c) => ({
      _id: c._id,
      orderId: c.orderId,
      level: c.level,
      amount: c.amount,
      status: c.status,
      source: c.source,
      createdAt: c.createdAt,
    })),
  });
};

export const createConversion = async (req, res) => {
  try {
    const actionType = String(req.body?.actionType || '').trim();
    const productId = parseProductId(req.body?.productId);
    const amount = Number(req.body?.amount ?? 0);
    const externalOrderId = String(req.body?.externalOrderId || '').trim();
    const provider = String(req.body?.provider || 'internal').trim();
    const providerPaymentId = String(req.body?.providerPaymentId || '').trim();
    const deviceId = extractDeviceId(req);
    const ipAddress = extractIpAddress(req);

    const result = await recordAttributedConversion({
      userId: req.user._id,
      actionType,
      productId: productId || null,
      amount,
      externalOrderId,
      provider,
      providerPaymentId,
      deviceId,
      ipAddress,
      metadata: req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {},
    });

    return res.status(201).json({
      orderId: result.order._id,
      actionType: result.order.actionType,
      commissionsCreated: result.commissions.length,
      attribution: result.attribution
        ? {
            clickId: result.attribution.clickId,
            referrerId: result.attribution.referrerId,
            expiresAt: result.attribution.expiresAt,
          }
        : null,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Conversion failed' });
  }
};
