import AppConfig from '../models/AppConfig.js';
import Transaction from '../models/Transaction.js';
import { createLedgerEntry, markLedgerStatus, money, SUCCESS_STATUSES } from './transactionService.js';
import { transferBetweenWallets } from './walletService.js';

const TASK_SOURCES = ['task', 'quiz', 'spin', 'ad'];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDailyRewardEarned = async (userId) => {
  const agg = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        source: { $in: TASK_SOURCES },
        direction: 'credit',
        createdAt: { $gte: startOfToday() },
        status: { $in: ['pending', ...SUCCESS_STATUSES] },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return money(agg?.[0]?.total ?? 0);
};

export const getDailyTaskStatus = async (userId) => {
  const txs = await Transaction.find({
    user: userId,
    source: { $in: ['quiz', 'spin', 'ad'] },
    direction: 'credit',
    createdAt: { $gte: startOfToday() },
    status: { $in: ['pending', ...SUCCESS_STATUSES] },
  }).select('source');

  const status = { quiz: false, spin: false, watch: false };
  for (const t of txs) {
    if (t.source === 'quiz') status.quiz = true;
    if (t.source === 'spin') status.spin = true;
    if (t.source === 'ad') status.watch = true;
  }
  return status;
};

const getTaskRewardAmount = (config, taskType) => {
  if (taskType === 'quiz') return money(config?.earnzone?.quiz?.rewardInr ?? 0);
  if (taskType === 'spin') return money(config?.earnzone?.spin?.rewardInr ?? 0);
  if (taskType === 'ad') return money(config?.earnzone?.ads?.rewardInr ?? 0);
  return money(config?.earnzone?.engagement?.rewardInr ?? 0);
};

export const createTaskReward = async ({
  userId,
  taskType,
  idempotencyKey,
  metadata = {},
  overrideAmount = null,
}) => {
  const config = await AppConfig.getSingleton();
  const ez = config?.earnzone || {};

  if (ez.enabled === false) {
    const err = new Error('Earn zone is disabled');
    err.statusCode = 400;
    throw err;
  }

  const rewardAmount = money(
    overrideAmount === null || overrideAmount === undefined
      ? getTaskRewardAmount(config, taskType)
      : overrideAmount,
  );
  if (!(rewardAmount > 0)) {
    return { rewardCreated: false, amount: 0, reason: 'reward_disabled' };
  }

  const dailyCap = money(ez.dailyLimitInr ?? 0);
  const earnedToday = await getDailyRewardEarned(userId);
  if (dailyCap > 0 && earnedToday >= dailyCap) {
    return { rewardCreated: false, amount: 0, reason: 'daily_cap_reached' };
  }

  const eligibleReward = dailyCap > 0 ? Math.max(0, Math.min(rewardAmount, dailyCap - earnedToday)) : rewardAmount;
  if (!(eligibleReward > 0)) {
    return { rewardCreated: false, amount: 0, reason: 'daily_cap_reached' };
  }

  const pendingTx = await createLedgerEntry({
    user: userId,
    wallet: 'pending',
    direction: 'credit',
    source: taskType === 'ad' ? 'ad' : taskType === 'spin' ? 'spin' : taskType === 'quiz' ? 'quiz' : 'task',
    status: 'pending',
    amount: eligibleReward,
    title: `${String(taskType || 'task').toUpperCase()} reward`,
    referenceType: 'task_reward',
    meta: metadata,
    idempotencyKey,
  });

  const autoValidate = true;
  if (!autoValidate) {
    return {
      rewardCreated: true,
      pendingTransactionId: pendingTx._id,
      settled: false,
      amount: eligibleReward,
    };
  }

  const settlement = await settlePendingReward({
    transactionId: pendingTx._id,
    targetWallet: 'reward',
    settledBy: 'system',
  });
  return {
    rewardCreated: true,
    pendingTransactionId: pendingTx._id,
    settled: true,
    amount: eligibleReward,
    settlement,
  };
};

export const reconcilePendingTaskRewards = async (userId) => {
  const pendingRewards = await Transaction.find({
    user: userId,
    wallet: 'pending',
    direction: 'credit',
    source: { $in: ['task', 'quiz', 'spin', 'ad'] },
    status: 'pending',
  }).sort({ createdAt: 1 });

  if (!pendingRewards.length) {
    return { settledCount: 0, settledAmount: 0 };
  }

  let settledCount = 0;
  let settledAmount = 0;
  for (const tx of pendingRewards) {
    const result = await settlePendingReward({
      transactionId: tx._id,
      targetWallet: 'reward',
      settledBy: 'system_reconcile',
    });
    settledCount += 1;
    settledAmount += Number(result?.creditTx?.amount ?? tx.amount ?? 0);
  }

  return { settledCount, settledAmount };
};

export const settlePendingReward = async ({
  transactionId,
  targetWallet = 'reward',
  settledBy = 'system',
}) => {
  const tx = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: 'pending' },
    { $set: { status: 'processing' } },
    { returnDocument: 'after' }
  );
  if (!tx) {
    const err = new Error('Pending reward transaction not found or already processing');
    err.statusCode = 404;
    throw err;
  }
  if (tx.wallet !== 'pending' || tx.direction !== 'credit') {
    const err = new Error('Transaction is not a pending reward credit');
    err.statusCode = 400;
    throw err;
  }
  if (tx.status === 'failed') {
    const err = new Error('Failed pending transaction cannot be settled');
    err.statusCode = 400;
    throw err;
  }

  if (!SUCCESS_STATUSES.includes(tx.status)) {
    await markLedgerStatus({
      transactionId: tx._id,
      status: 'success',
      patch: { meta: { ...(tx.meta || {}), settledBy, settledAt: new Date() } },
    });
  }

  const transfer = await transferBetweenWallets({
    userId: tx.user,
    amount: tx.amount,
    fromWallet: 'pending',
    toWallet: targetWallet,
    source: 'settlement',
    title: `Reward settled to ${targetWallet}`,
    status: 'success',
    meta: {
      sourceTransactionId: String(tx._id),
      sourceType: tx.source,
      settledBy,
    },
    baseIdempotencyKey: `settle:${tx._id}:${targetWallet}`,
  });

  return transfer;
};

export const rejectPendingReward = async ({ transactionId, reason = '' }) => {
  const tx = await Transaction.findById(transactionId);
  if (!tx) {
    const err = new Error('Pending reward transaction not found');
    err.statusCode = 404;
    throw err;
  }
  if (tx.wallet !== 'pending' || tx.direction !== 'credit') {
    const err = new Error('Transaction is not a pending reward credit');
    err.statusCode = 400;
    throw err;
  }
  if (tx.status === 'failed') return tx;
  return await markLedgerStatus({
    transactionId: tx._id,
    status: 'failed',
    patch: { meta: { ...(tx.meta || {}), rejectionReason: reason } },
  });
};
