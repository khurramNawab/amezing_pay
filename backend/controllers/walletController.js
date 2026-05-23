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
      meta: {
        payment_session_id: cfOrder.payment_session_id,
        cf_order_id: cfOrder.cf_order_id,
      },
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

    // payment_session_id is stored in meta at order creation time.
    // Cashfree does NOT return it on GET /orders — only on POST /orders.
    const sessionId = po.meta?.payment_session_id;
    if (!sessionId) return res.status(500).send('Payment session expired. Please go back and try again.');

    const cfMode = env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amezing Pay - Wallet Top-up</title>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#0b1220;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
      .card{width:min(480px,95vw);background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.2);border-radius:20px;padding:28px;text-align:center}
      .title{font-weight:700;font-size:20px;margin-bottom:6px}
      .sub{color:rgba(226,232,240,0.65);font-size:13px;margin-bottom:4px}
      .amount{font-size:28px;font-weight:800;color:#818cf8;margin:12px 0 24px}
      .btn{width:100%;height:52px;border-radius:14px;border:0;cursor:pointer;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-weight:700;font-size:16px;letter-spacing:0.3px;transition:opacity .2s}
      .btn:hover{opacity:.9}
      .btn:disabled{opacity:.5;cursor:not-allowed}
      .status{margin-top:16px;font-size:13px;color:rgba(226,232,240,0.6);min-height:20px}
      .err{color:#f87171}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Wallet Top-up</div>
      <div class="sub">Order: <code style="font-size:11px">${orderId}</code></div>
      <div class="amount">&#8377; ${Number(po.amount ?? 0).toFixed(2)}</div>
      <button id="pay" class="btn">Proceed to Pay</button>
      <div id="status" class="status"></div>
    </div>
    <script>
      (function() {
        var SESSION_ID = "${sessionId}";
        var MODE = "${cfMode}";

        function setStatus(msg, isErr) {
          var el = document.getElementById('status');
          el.textContent = msg;
          el.className = 'status' + (isErr ? ' err' : '');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: isErr ? 'error' : 'log',
              message: msg
            }));
          }
        }

        window.onerror = function(message, source, lineno, colno, error) {
          setStatus('JS Error: ' + message + ' (line ' + lineno + ')', true);
          return true;
        };

        // Check if Cashfree loaded
        if (typeof Cashfree === 'undefined') {
          setStatus('Cashfree SDK failed to load. Check internet connection.', true);
        }

        document.getElementById('pay').addEventListener('click', function() {
          var btn = document.getElementById('pay');
          btn.disabled = true;
          setStatus('Initialising payment gateway...');

          try {
            if (typeof Cashfree === 'undefined') {
              throw new Error('Cashfree SDK is not loaded yet');
            }
            var cashfree = Cashfree({ mode: MODE });
            setStatus('Opening checkout window...');
            cashfree.checkout({
              paymentSessionId: SESSION_ID,
              redirectTarget: '_self',
            }).then(function(result) {
              if (result && result.error) {
                setStatus('Payment error: ' + result.error.message, true);
                btn.disabled = false;
              } else if (result && result.redirect) {
                setStatus('Redirecting...');
              } else {
                setStatus('Checkout process launched.');
              }
            }).catch(function(err) {
              setStatus('Unexpected error: ' + (err.message || err), true);
              btn.disabled = false;
            });
          } catch(e) {
            setStatus('Could not load payment gateway: ' + e.message, true);
            btn.disabled = false;
          }
        });
      })();
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
