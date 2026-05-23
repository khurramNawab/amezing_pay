import AppConfig from '../models/AppConfig.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createLedgerEntry, money } from './transactionService.js';

const clampPercent = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(Math.max(x, 0), 100);
};

const getPercent = ({ override, global }) => {
  if (override === null || override === undefined || override === '') return clampPercent(global);
  return clampPercent(override);
};

const credit = async ({
  userId,
  saleId,
  level,
  percentage,
  amount,
  baseAmount,
  title,
  orderId,
}, { session } = {}) => {
  const amt = money(amount);
  if (amt <= 0) return null;

  const tx = await createLedgerEntry({
      user: userId,
      wallet: 'pending',
      direction: 'credit',
      source: 'commission',
      status: 'pending',
      sale: saleId,
      commissionLevel: level,
      percentage,
      amount: amt,
      title,
      type: 'income',
      category: level === 'seller' ? 'commission' : 'referral',
      idempotencyKey: `sale:${saleId}:commission:${level}:${userId}`,
      referenceType: 'sale',
      referenceId: String(saleId),
  }, { session });

  await CommissionRecord.updateOne(
    { orderId, level },
    {
      $setOnInsert: {
        user: userId,
        orderId,
        saleId,
        level,
        rateType: 'percentage',
        rateValue: clampPercent(percentage),
        baseAmount: money(baseAmount),
        amount: amt,
        source: 'purchase',
        status: 'pending',
        pendingTransactionId: tx._id,
        metadata: { legacyLevel: level },
      },
    },
    { upsert: true, session },
  ).catch(() => {});

  return tx;
};

export const applyTwoTierCommission = async ({ saleId, sellerId, buyerId, amount }, { session } = {}) => {
  const config = await AppConfig.getSingleton();
  const commissions = config.commissions || {};

  if (commissions.enabled === false) {
    return { applied: false, reason: 'commission_disabled' };
  }

  const minAmount = Number(commissions.minTransactionAmount ?? 0);
  if (Number(amount) < minAmount) {
    return { applied: false, reason: 'below_threshold' };
  }

  const seller = await User.findById(sellerId).session(session);
  if (!seller) return { applied: false, reason: 'seller_not_found' };
  if (seller.isBlocked) return { applied: false, reason: 'seller_blocked' };

  // Prevent self-referral
  const uplineId =
    seller.referredBy && String(seller.referredBy) !== String(seller._id)
      ? seller.referredBy
      : null;

  const sellerEnabled = seller.commission?.enabled !== false;
  if (!sellerEnabled) {
    return { applied: false, reason: 'seller_commission_disabled' };
  }

  const sellerPercent = getPercent({
    override: seller.commission?.sellerPercent,
    global: commissions.sellerPercent ?? commissions.level1Percent,
  });

  const sellerCommission = money((Number(amount) * sellerPercent) / 100);

  const order = await Order.findOneAndUpdate(
    { saleId },
    {
      $setOnInsert: {
        user: buyerId || sellerId,
        actionType: 'purchase',
        status: 'success',
        amount: money(amount),
        saleId,
        level1ReferrerId: sellerId,
        level2ReferrerId: seller.referredBy || null,
        validatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after', session },
  );

  const sellerTx = await credit({
    userId: seller._id,
    saleId,
    level: 'seller',
    percentage: sellerPercent,
    amount: sellerCommission,
    baseAmount: amount,
    title: `Seller commission (${sellerPercent}%)`,
    orderId: order._id,
  }, { session });

  let uplineTx = null;

  if (uplineId) {
    const upline = await User.findById(uplineId).session(session);
    const uplineEnabled = upline && !upline.isBlocked && upline.commission?.enabled !== false;

    if (uplineEnabled) {
      // Upline percent can be overridden on the upline agent account
      const uplinePercent = getPercent({
        override: upline.commission?.uplinePercent,
        global: commissions.uplinePercent ?? commissions.level2Percent,
      });
      const uplineCommission = money((Number(amount) * uplinePercent) / 100);
      uplineTx = await credit({
        userId: upline._id,
        saleId,
        level: 'upline',
        percentage: uplinePercent,
        amount: uplineCommission,
        baseAmount: amount,
        title: `Upline bonus (${uplinePercent}%)`,
        orderId: order._id,
      }, { session });
    }
  }

  return {
    applied: true,
    sellerTxId: sellerTx?._id || null,
    uplineTxId: uplineTx?._id || null,
    buyerId: buyerId || null,
  };
};
