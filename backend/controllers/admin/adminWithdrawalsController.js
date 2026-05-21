import Withdrawal from '../../models/Withdrawal.js';
import {
  markWithdrawalFailed,
  markWithdrawalSuccess,
  setWithdrawalProcessing,
} from '../../services/withdrawalService.js';
import AdminLog from '../../models/AdminLog.js';
import PayoutJob from '../../models/PayoutJob.js';
import { logger } from '../../services/logger.js';
import mongoose from 'mongoose';

const parseIntSafe = (v, def) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : def;
};

const mapStatus = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'].includes(s)) return s;
  return '';
};

export const listWithdrawals = async (req, res) => {
  const status = mapStatus(req.query.status || 'PENDING');
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 20)));
  const skip = (page - 1) * limit;

  const query = {};
  if (status) query.status = status;

  const [total, items] = await Promise.all([
    Withdrawal.countDocuments(query),
    Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name phone kycStatus')
      .populate('initiationTransactionId', 'amount status source wallet direction')
      .populate('reversalTransactionId', 'amount status source wallet direction'),
  ]);

  return res.json({ items, page, limit, total });
};

export const markWithdrawalAsProcessing = async (req, res) => {
  try {
    const row = await setWithdrawalProcessing({ withdrawalId: req.params.id, adminId: req.user._id });
    return res.json({ message: 'Marked as processing', item: row });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Failed' });
  }
};

export const approveWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let row;
    await session.withTransaction(async () => {
      row = await setWithdrawalProcessing({ withdrawalId: req.params.id, adminId: req.user._id }, { session });

      // Create a persistent payout job in the queue
      await PayoutJob.create([{
        withdrawal: row._id,
        status: 'pending',
        runAt: new Date(),
      }], { session });

      await AdminLog.create([{
        adminId: req.user._id,
        action: 'APPROVE_WITHDRAWAL',
        targetId: row._id,
        details: { providerPayoutId: req.body?.providerPayoutId, note: req.body?.note },
        ipAddress: req.socket?.remoteAddress || ''
      }], { session });
    });

    return res.json({ message: 'Approved and Queued for Payout', item: row });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Failed' });
  } finally {
    session.endSession();
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const reason = String(req.body?.reason || 'Rejected by admin').trim();
    const note = String(req.body?.note || '').trim();
    const row = await markWithdrawalFailed({
      withdrawalId: req.params.id,
      adminId: req.user._id,
      reason,
      note,
    });

    await AdminLog.create({
        adminId: req.user._id,
        action: 'REJECT_WITHDRAWAL',
        targetId: req.params.id,
        details: { reason, note },
        ipAddress: req.socket?.remoteAddress || ''
    });

    return res.json({ message: 'Rejected and refunded', item: row });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Failed' });
  }
};
