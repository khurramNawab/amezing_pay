import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentOrder from '../models/PaymentOrder.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import WebhookLog from '../models/WebhookLog.js';
import { createLedgerEntry } from '../services/transactionService.js';
import { buildWalletSummary } from '../services/walletService.js';
import { requestWithdrawal as requestWithdrawalFlow } from '../services/withdrawalService.js';
import { reconcilePendingTaskRewards } from '../services/rewardEngine.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../services/logger.js';
import { verifyRazorpayWebhook } from '../services/razorpayWebhookService.js';
import { createCashfreeOrder, getCashfreeOrder } from '../services/cashfreeService.js';

const money = (n) => Math.round(Number(n ?? 0) * 100) / 100;

const getRazorpay = () => {
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const sign = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  const a = Buffer.from(String(signature || ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return (a.length === b.length) && crypto.timingSafeEqual(a, a.length === b.length ? b : a);
};

const getRazorpayKeyId = () => env.RAZORPAY_KEY_ID;

const extractError = (e) => {
  const status = e?.statusCode || e?.status || 500;
  const message =
    e?.message ||
    e?.error?.description ||
    e?.error?.message ||
    (typeof e === 'string' ? e : 'Server Error');
  return { status, message };
};

const buildReceipt = (userId) => {
  const uid = String(userId || '').replace(/[^a-zA-Z0-9]/g, '');
  const uidShort = uid.slice(-8) || 'user';
  const ts = String(Date.now()).slice(-10);
  return `w_${uidShort}_${ts}`;
};

export const getWalletSummary = async (req, res) => {
  await reconcilePendingTaskRewards(req.user._id).catch(() => {});
  const summary = await buildWalletSummary(req.user._id);
  return res.json(summary);
};

export const listWalletTransactions = async (req, res) => {
  const items = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  return res.json(items);
};

export const listMyWithdrawals = async (req, res) => {
  const items = await Withdrawal.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('initiationTransactionId', 'amount status source wallet direction')
    .populate('reversalTransactionId', 'amount status source wallet direction');
  return res.json(items);
};

export const createWalletTopupOrder = async (req, res) => {
  try {
    const amount = money(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be > 0' });
    }

    // Use Cashfree
    const cfOrder = await createCashfreeOrder({
      orderId: `cf_wallet_${Date.now()}_${String(req.user._id).slice(-6)}`,
      orderAmount: amount,
      customerId: req.user._id,
      customerPhone: req.user.phone,
      customerEmail: req.user.email,
      orderNote: 'Wallet Top-up'
    });

    await PaymentOrder.create({
      user: req.user._id,
      provider: 'cashfree',
      purpose: 'wallet_topup',
      amount,
      currency: 'INR',
      orderId: cfOrder.order_id,
      status: 'created',
    });

    return res.json({
      ...cfOrder,
      provider: 'cashfree'
    });
  } catch (e) {
    const { status, message } = extractError(e);
    return res.status(status).json({ message });
  }
};

export const verifyWalletTopup = async (req, res) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || '').trim();
    const signature = String(req.body?.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing Razorpay fields' });
    }

    const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!ok) return res.status(400).json({ message: 'Invalid signature sent!' });

    const po = await PaymentOrder.findOne({ provider: 'razorpay', orderId, user: req.user._id });
    if (!po) return res.status(404).json({ message: 'Payment order not found' });

    if (po.status === 'paid') {
      return res.json({ message: 'Already credited', walletCredited: true });
    }

    po.status = 'paid';
    po.paymentId = paymentId;
    await po.save();

    const tx = await createLedgerEntry({
      user: req.user._id,
      wallet: 'main',
      direction: 'credit',
      source: 'topup',
      provider: 'razorpay',
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      amount: po.amount,
      title: 'Wallet Top-up',
      type: 'income',
      category: 'topup',
      status: 'success',
      idempotencyKey: `topup:${orderId}:${paymentId}`,
    });

    return res.json({ message: 'Wallet credited', walletCredited: true, transactionId: tx._id });
  } catch (e) {
    const { status, message } = extractError(e);
    return res.status(status).json({ message });
  }
};

export const walletTopupCheckoutPage = async (req, res) => {
  try {
    const orderId = String(req.query?.orderId || '').trim();
    if (!orderId) return res.status(400).send('orderId is required');

    const po = await PaymentOrder.findOne({ provider: 'cashfree', orderId });
    if (!po) return res.status(404).send('Order not found');

    // For Cashfree, we need the payment_session_id which we should have stored or fetch now
    const cfOrder = await getCashfreeOrder(orderId);
    const sessionId = cfOrder.payment_session_id;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amezing Pay - Wallet Top-up</title>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    <style>
      body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#0b1220;color:#e2e8f0;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
      .card{width:min(520px,92vw);background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.25);border-radius:18px;padding:22px;text-align:center}
      .title{font-weight:700;font-size:18px}
      .muted{color:rgba(226,232,240,0.7);font-size:13px;margin-top:6px}
      .btn{margin-top:18px;width:100%;height:48px;border-radius:14px;border:0;cursor:pointer;background:#4f46e5;color:#fff;font-weight:700}
      .status{margin-top:14px;font-size:13px;color:rgba(226,232,240,0.75)}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Wallet Top-up</div>
      <div class="muted">Order: <code>${orderId}</code></div>
      <div class="muted">Amount: <strong>INR ${Number(po.amount ?? 0).toFixed(2)}</strong></div>
      <button id="pay" class="btn">Proceed to Pay</button>
      <div id="status" class="status"></div>
    </div>
    <script>
      const cashfree = Cashfree({ mode: "${env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox'}" });
      document.getElementById('pay').addEventListener('click', () => {
        cashfree.checkout({
          paymentSessionId: "${sessionId}",
          redirectTarget: "_self"
        });
      });
    </script>
  </body>
</html>`);
  } catch (e) {
    const { status, message } = extractError(e);
    return res.status(status).send(message);
  }
};

export const verifyWalletTopupPublic = async (req, res) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || '').trim();
    const signature = String(req.body?.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing Razorpay fields' });
    }

    const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!ok) return res.status(400).json({ message: 'Invalid signature sent!' });

    const po = await PaymentOrder.findOne({ provider: 'razorpay', orderId });
    if (!po) return res.status(404).json({ message: 'Payment order not found' });

    if (po.status === 'paid') {
      return res.json({ message: 'Already credited', walletCredited: true });
    }

    po.status = 'paid';
    po.paymentId = paymentId;
    await po.save();

    await createLedgerEntry({
      user: po.user,
      wallet: 'main',
      direction: 'credit',
      source: 'topup',
      provider: 'razorpay',
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      amount: po.amount,
      title: 'Wallet Top-up',
      type: 'income',
      category: 'topup',
      status: 'success',
      idempotencyKey: `topup:${orderId}:${paymentId}`,
    });

    return res.json({ message: 'Wallet credited', walletCredited: true });
  } catch (e) {
    const { status, message } = extractError(e);
    return res.status(status).json({ message });
  }
};

export const razorpayWebhook = async (req, res) => {
  const eventId = String(req.headers['x-razorpay-event-id'] || '').trim();
  const signature = String(req.headers['x-razorpay-signature'] || '').trim();

  if (!eventId) return res.status(400).json({ message: 'Missing event id' });
  if (!signature) return res.status(400).json({ message: 'Missing signature' });

  let webhookLog;
  try {
    webhookLog = await WebhookLog.create({
      eventId,
      eventType: req.body?.event || 'unknown',
      payload: req.body || {},
      status: 'received',
    });
  } catch (err) {
    if (err?.code === 11000) {
      logger.info(`[WALLET WEBHOOK] Duplicate event ignored: ${eventId}`);
      return res.status(200).json({ status: 'duplicate' });
    }
    throw err;
  }

  try {
    let verified;
    try {
      verified = verifyRazorpayWebhook({
        rawBody: req.rawBody,
        secret: env.RAZORPAY_WEBHOOK_SECRET,
        signature,
      });
    } catch (e) {
      webhookLog.status = 'failed';
      webhookLog.error = e?.message || 'Signature verification error';
      await webhookLog.save();
      return res.status(e?.statusCode || 400).json({ message: webhookLog.error });
    }

    if (!verified.ok) {
      webhookLog.status = 'failed';
      webhookLog.error = 'Invalid signature';
      await webhookLog.save();
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body || {};
    if (event !== 'payment.captured') {
      webhookLog.status = 'processed';
      await webhookLog.save();
      return res.status(200).json({ status: 'ignored' });
    }

    const payment = payload?.payment?.entity;
    if (!payment || typeof payment !== 'object') {
      webhookLog.status = 'failed';
      webhookLog.error = 'Malformed payload';
      await webhookLog.save();
      return res.status(400).json({ message: 'Malformed payload' });
    }

    const orderId = payment.order_id;
    const paymentId = payment.id;
    if (!orderId || !paymentId) {
      webhookLog.status = 'failed';
      webhookLog.error = 'Missing orderId/paymentId';
      await webhookLog.save();
      return res.status(400).json({ message: 'Malformed payload' });
    }

    const po = await PaymentOrder.findOne({ orderId, status: 'created', provider: 'razorpay' });
    if (po) {
      po.status = 'paid';
      po.paymentId = paymentId;
      await po.save();

      await createLedgerEntry({
        user: po.user,
        wallet: 'main',
        direction: 'credit',
        source: 'topup',
        provider: 'razorpay',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: po.amount,
        title: 'Wallet Top-up (Webhook)',
        type: 'income',
        category: 'topup',
        status: 'success',
        idempotencyKey: `topup:${orderId}:${paymentId}`,
      });
    }

    webhookLog.status = 'processed';
    await webhookLog.save();
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (webhookLog) {
      webhookLog.status = 'failed';
      webhookLog.error = err?.message || 'Webhook error';
      await webhookLog.save().catch(() => {});
    }
    logger.error('[WALLET WEBHOOK] Error', { message: err?.message, stack: err?.stack, eventId });
    return res.status(err?.statusCode || 500).json({ message: err?.statusCode ? err.message : 'Server Error' });
  }
};

export const requestWithdraw = async (req, res) => {
  try {
    const amount = money(req.body?.amount);
    const method = String(req.body?.method || 'upi').trim();
    const upiId = String(req.body?.upiId || '').trim();
    const idempotencyKey = String(
      req.headers['x-idempotency-key'] || req.body?.idempotencyKey || '',
    ).trim();
    
    if (!idempotencyKey) {
        return res.status(400).json({ message: 'idempotencyKey is rigidly required to prevent double requests' });
    }

    if (method === 'upi' && !upiId) return res.status(400).json({ message: 'upiId is required' });

    const { withdrawal, summary } = await requestWithdrawalFlow({
      userId: req.user._id,
      amount,
      method,
      provider: 'manual',
      destination: { upiId },
      idempotencyKey,
      meta: { requestedFrom: 'wallet_api' },
    });

    return res.status(201).json({
      message: 'Withdrawal requested',
      withdrawalId: withdrawal._id,
      transactionId: withdrawal.initiationTransactionId,
      wallet: summary,
    });
  } catch (error) {
    return res
      .status(error?.statusCode || 500)
      .json({ message: error.message || 'Could not create withdrawal request' });
  }
};
