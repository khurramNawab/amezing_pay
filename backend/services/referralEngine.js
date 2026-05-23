import crypto from 'crypto';
import mongoose from 'mongoose';
import AppConfig from '../models/AppConfig.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Order from '../models/Order.js';
import ReferralTracking from '../models/ReferralTracking.js';
import User from '../models/User.js';
import { createLedgerEntry, money } from './transactionService.js';

const clampPercent = (n) => Math.min(Math.max(Number(n ?? 0), 0), 100);

const buildClickId = () => crypto.randomBytes(12).toString('hex');

const toObjectIdOrNull = (value) => {
  try {
    if (!value) return null;
    if (value instanceof mongoose.Types.ObjectId) return value;
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
};

const getReferralWindowDays = async () => {
  const config = await AppConfig.getSingleton();
  const windowDays = Number(config?.referral?.attributionWindowDays || 7);
  return Math.min(Math.max(windowDays, 1), 60);
};

export const resolveReferrer = async (ref) => {
  const raw = String(ref || '').trim();
  if (!raw) return null;

  const byCode = await User.findOne({ referralCode: raw }).select('_id referralCode referredBy');
  if (byCode) return byCode;

  const byId = toObjectIdOrNull(raw);
  if (!byId) return null;
  return await User.findById(byId).select('_id referralCode referredBy');
};

export const generateReferralLink = ({ productId, refValue, baseUrl }) => {
  const cleanBase = String(baseUrl || '').replace(/\/$/, '');
  const pid = String(productId || '').trim();
  const ref = encodeURIComponent(String(refValue || '').trim());
  return `${cleanBase}/product/${encodeURIComponent(pid)}?ref=${ref}`;
};

export const captureReferralClick = async ({
  ref,
  productId,
  deviceId = '',
  ipAddress = '',
  userAgent = '',
  sourcePath = '',
  attributedUserId = null,
  metadata = {},
}) => {
  const referrer = await resolveReferrer(ref);
  if (!referrer) return null;
  if (attributedUserId && String(referrer._id) === String(attributedUserId)) return null;

  const windowDays = await getReferralWindowDays();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  if (deviceId) {
    await ReferralTracking.updateMany(
      { deviceId, productId: productId || null, isActive: true },
      { $set: { isActive: false } },
    );
  }

  const row = await ReferralTracking.create({
    clickId: buildClickId(),
    referrerId: referrer._id,
    referralCode: referrer.referralCode || '',
    productId: productId || null,
    deviceId: String(deviceId || '').trim(),
    attributedUserId: attributedUserId || null,
    ipAddress: String(ipAddress || '').trim(),
    userAgent: String(userAgent || '').trim(),
    sourcePath: String(sourcePath || '').trim(),
    attributionModel: 'last_click',
    clickedAt: now,
    expiresAt,
    isActive: true,
    meta: metadata,
  });

  return row;
};

export const bindReferralAttributionToUser = async ({ userId, deviceId }) => {
  if (!userId || !deviceId) return;
  await ReferralTracking.updateMany(
    { deviceId: String(deviceId), attributedUserId: null, expiresAt: { $gte: new Date() } },
    { $set: { attributedUserId: userId } },
  );
};

export const resolveLastClickAttribution = async ({ userId, deviceId, productId = null }) => {
  const now = new Date();
  const query = {
    isActive: true,
    expiresAt: { $gte: now },
  };

  if (deviceId) query.deviceId = String(deviceId);
  else if (userId) query.attributedUserId = userId;

  if (productId) query.productId = productId;

  const click = await ReferralTracking.findOne(query).sort({ clickedAt: -1 });
  return click || null;
};

const buildReferrerChain = async ({ actorUserId, level1ReferrerId }) => {
  if (!level1ReferrerId) return { level1: null, level2: null };
  if (String(level1ReferrerId) === String(actorUserId)) return { level1: null, level2: null };

  const level1 = await User.findById(level1ReferrerId).select('_id referredBy isBlocked');
  if (!level1 || level1.isBlocked) return { level1: null, level2: null };

  const level2Id =
    level1.referredBy && String(level1.referredBy) !== String(actorUserId)
      ? level1.referredBy
      : null;
  if (!level2Id) return { level1: level1._id, level2: null };

  const level2 = await User.findById(level2Id).select('_id isBlocked');
  if (!level2 || level2.isBlocked || String(level2._id) === String(level1._id)) {
    return { level1: level1._id, level2: null };
  }

  return { level1: level1._id, level2: level2._id };
};

const createCommissionRecordAndPendingEntry = async ({
  userId,
  orderId,
  level,
  source,
  rateType,
  rateValue,
  baseAmount,
  amount,
  metadata,
  idempotencyBase,
}) => {
  const commissionAmount = money(amount);
  if (!(commissionAmount > 0)) return null;

  const pendingTx = await createLedgerEntry({
    user: userId,
    wallet: 'pending',
    direction: 'credit',
    source: 'commission',
    commissionLevel: level,
    status: 'pending',
    amount: commissionAmount,
    title: `${String(level).toUpperCase()} commission`,
    referenceType: 'commission',
    referenceId: String(orderId),
    meta: metadata,
    idempotencyKey: `${idempotencyBase}:${level}:pending`,
  });

  const record = await CommissionRecord.findOneAndUpdate(
    { orderId, level },
    {
      $setOnInsert: {
        user: userId,
        orderId,
        level,
        source,
        rateType,
        rateValue: money(rateValue),
        baseAmount: money(baseAmount),
        amount: commissionAmount,
        status: 'pending',
        pendingTransactionId: pendingTx._id,
        metadata,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  return record;
};

const applyCommissionsForOrder = async ({ order, sourceType, baseAmount }) => {
  const config = await AppConfig.getSingleton();
  if (config?.commissions?.enabled === false) return [];

  const refs = await buildReferrerChain({
    actorUserId: order.user,
    level1ReferrerId: order.level1ReferrerId,
  });

  const idempotencyBase = `order:${order._id}:${sourceType}`;
  const records = [];

  if (sourceType === 'install') {
    const l1 = money(config?.referral?.level1InstallRewardInr ?? config?.referral?.installRewardInr ?? 0);
    const l2 = money(config?.referral?.level2InstallRewardInr ?? 0);

    if (refs.level1 && l1 > 0) {
      const r1 = await createCommissionRecordAndPendingEntry({
        userId: refs.level1,
        orderId: order._id,
        level: 'level1',
        source: 'install',
        rateType: 'fixed',
        rateValue: l1,
        baseAmount: baseAmount || 1,
        amount: l1,
        metadata: { actionType: 'install' },
        idempotencyBase,
      });
      if (r1) records.push(r1);
    }

    if (refs.level2 && l2 > 0) {
      const r2 = await createCommissionRecordAndPendingEntry({
        userId: refs.level2,
        orderId: order._id,
        level: 'level2',
        source: 'install',
        rateType: 'fixed',
        rateValue: l2,
        baseAmount: baseAmount || 1,
        amount: l2,
        metadata: { actionType: 'install' },
        idempotencyBase,
      });
      if (r2) records.push(r2);
    }
    return records;
  }

  const base = money(baseAmount);
  const l1pct = clampPercent(config?.commissions?.level1Percent ?? config?.commissions?.sellerPercent ?? 0);
  const l2pct = clampPercent(config?.commissions?.level2Percent ?? config?.commissions?.uplinePercent ?? 0);

  if (refs.level1 && l1pct > 0) {
    const r1 = await createCommissionRecordAndPendingEntry({
      userId: refs.level1,
      orderId: order._id,
      level: 'level1',
      source: 'purchase',
      rateType: 'percentage',
      rateValue: l1pct,
      baseAmount: base,
      amount: money((base * l1pct) / 100),
      metadata: { actionType: 'purchase' },
      idempotencyBase,
    });
    if (r1) records.push(r1);
  }

  if (refs.level2 && l2pct > 0) {
    const r2 = await createCommissionRecordAndPendingEntry({
      userId: refs.level2,
      orderId: order._id,
      level: 'level2',
      source: 'purchase',
      rateType: 'percentage',
      rateValue: l2pct,
      baseAmount: base,
      amount: money((base * l2pct) / 100),
      metadata: { actionType: 'purchase' },
      idempotencyBase,
    });
    if (r2) records.push(r2);
  }

  return records;
};

export const recordAttributedConversion = async ({
  userId,
  actionType,
  productId = null,
  amount = 0,
  externalOrderId = '',
  provider = 'internal',
  providerPaymentId = '',
  deviceId = '',
  ipAddress = '',
  metadata = {},
}) => {
  const cleanAction = String(actionType || '').trim().toLowerCase();
  if (!['install', 'purchase'].includes(cleanAction)) {
    const err = new Error('Unsupported conversion action');
    err.statusCode = 400;
    throw err;
  }
  if (cleanAction === 'purchase' && !(money(amount) > 0)) {
    const err = new Error('Purchase amount must be greater than 0');
    err.statusCode = 400;
    throw err;
  }

  const attribution = await resolveLastClickAttribution({ userId, deviceId, productId });
  const config = await AppConfig.getSingleton();

  if (cleanAction === 'install' && deviceId && config?.fraud?.requireUniqueInstallPerDevice !== false) {
    const existingInstall = await Order.findOne({
      actionType: 'install',
      deviceId: String(deviceId),
      status: { $in: ['pending', 'success'] },
    }).select('_id user');
    if (existingInstall && String(existingInstall.user) !== String(userId)) {
      const err = new Error('Duplicate install detected for this device');
      err.statusCode = 409;
      throw err;
    }
  }

  const level1ReferrerId =
    attribution && String(attribution.referrerId) !== String(userId) ? attribution.referrerId : null;

  const chain = await buildReferrerChain({ actorUserId: userId, level1ReferrerId });

  const payload = {
    user: userId,
    productId: productId || null,
    actionType: cleanAction,
    status: 'success',
    amount: money(cleanAction === 'purchase' ? amount : 0),
    externalOrderId: String(externalOrderId || '').trim(),
    provider: String(provider || 'internal').trim(),
    providerPaymentId: String(providerPaymentId || '').trim(),
    deviceId: String(deviceId || '').trim(),
    ipAddress: String(ipAddress || '').trim(),
    referralTrackingId: attribution?._id || null,
    level1ReferrerId: chain.level1,
    level2ReferrerId: chain.level2,
    attributedAt: attribution ? new Date() : null,
    validatedAt: new Date(),
    meta: metadata,
  };

  let order;
  try {
    order = await Order.create(payload);
  } catch (error) {
    if (String(error?.code) === '11000') {
      if (payload.externalOrderId) {
        order = await Order.findOne({ actionType: cleanAction, externalOrderId: payload.externalOrderId });
      } else if (cleanAction === 'install' && payload.deviceId) {
        order = await Order.findOne({
          actionType: 'install',
          deviceId: payload.deviceId,
          productId: payload.productId || null,
          user: payload.user,
        });
      }
      if (!order) throw error;
    } else {
      throw error;
    }
  }

  const records = await applyCommissionsForOrder({
    order,
    sourceType: cleanAction,
    baseAmount: cleanAction === 'purchase' ? payload.amount : 1,
  });

  return { order, commissions: records, attribution };
};
