import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentOrder from '../models/PaymentOrder.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import WebhookLog from '../models/WebhookLog.js';
import { createLedgerEntry, money } from '../services/transactionService.js';
import { assertSufficientMainBalance, buildWalletSummary, getWalletBalances } from '../services/walletService.js';
import { applyTwoTierCommission } from '../services/commissionService.js';
import { recordAttributedConversion } from '../services/referralEngine.js';
import { extractDeviceId, extractIpAddress } from '../services/fraudService.js';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../services/logger.js';
import { verifyRazorpayWebhook } from '../services/razorpayWebhookService.js';
import { createCashfreeOrder, getCashfreeOrder } from '../services/cashfreeService.js';

const getRazorpay = () =>

  new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });

const getRazorpayKeyId = () => env.RAZORPAY_KEY_ID;

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


const buildReceipt = (prefix, userId) => {
  const uid = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'user';
  const ts = String(Date.now()).slice(-10);
  return `${prefix}_${uid}_${ts}`;
};

const normalizeItems = async (rawItems) => {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) {
    const err = new Error('At least one item is required');
    err.statusCode = 400;
    throw err;
  }

  const mapped = items.map((item) => ({
    productId: String(item?.productId || item?._id || '').trim(),
    quantity: Math.max(1, Number(item?.quantity || 1)),
  }));

  const productIds = [...new Set(mapped.map((x) => x.productId).filter(Boolean))];
  if (!productIds.length) {
    const err = new Error('Invalid product ids');
    err.statusCode = 400;
    throw err;
  }

  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).select(
    '_id title price sellerId source',
  );
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const normalized = [];
  for (const row of mapped) {
    const product = productMap.get(row.productId);
    if (!product) {
      const err = new Error(`Product not available: ${row.productId}`);
      err.statusCode = 404;
      throw err;
    }
    const unitPrice = money(product.price);
    normalized.push({
      productId: product._id,
      title: product.title,
      quantity: row.quantity,
      unitPrice,
      totalPrice: money(unitPrice * row.quantity),
      sellerId: product.sellerId,
      source: product.source || 'internal',
    });
  }

  return normalized;
};

const processPurchase = async ({ userId, paymentOrder, providerPaymentId, provider }, { session } = {}) => {
  const meta = paymentOrder.meta || {};
  if (meta.purchaseProcessed === true) {
    return { alreadyProcessed: true, purchaseId: meta.purchaseId || null };
  }

  const items = Array.isArray(meta.items) ? meta.items : [];
  const walletDebit = money(meta.walletDebit ?? 0);
  const totalAmount = money(meta.totalAmount ?? 0);
  if (!items.length || !(totalAmount > 0)) {
    const err = new Error('Invalid stored purchase order metadata');
    err.statusCode = 400;
    throw err;
  }

  if (walletDebit > 0) {
    await assertSufficientMainBalance({ userId, amount: walletDebit, session });
    await createLedgerEntry({
      user: userId,
      wallet: 'main',
      direction: 'debit',
      source: 'purchase',
      status: 'success',
      amount: walletDebit,
      title: 'Purchase paid from wallet',
      type: 'adjustment',
      category: 'internal',
      referenceType: 'payment_order',
      referenceId: String(paymentOrder._id),
      idempotencyKey: `purchase:${paymentOrder._id}:wallet_debit`,
      meta: { paymentOrderId: String(paymentOrder._id) },
    }, { session });
  }

  const deviceId = meta.deviceId || '';
  const ipAddress = meta.ipAddress || '';
  const saleIds = [];
  const commissionResults = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const providerPaymentRef = `${providerPaymentId}:${i}`;
    let sale;
    try {
      sale = await Sale.create([{
        sellerId: item.sellerId,
        buyerId: userId,
        amount: money(item.totalPrice),
        status: 'completed',
        title: `Purchase - ${item.title}`,
        provider,
        providerPaymentId: providerPaymentRef,
        meta: {
          paymentOrderId: String(paymentOrder._id),
          productId: String(item.productId),
          quantity: item.quantity,
        },
      }], { session }).then(res => res[0]);
    } catch (error) {
      if (String(error?.code) === '11000') {
        sale = await Sale.findOne({ provider, providerPaymentId: providerPaymentRef }).session(session);
      } else {
        throw error;
      }
    }

    if (!sale) continue;
    saleIds.push(String(sale._id));

    const commission = await applyTwoTierCommission({
      saleId: sale._id,
      sellerId: sale.sellerId,
      buyerId: sale.buyerId,
      amount: sale.amount,
    }, { session });
    commissionResults.push(commission);

    await recordAttributedConversion({
      userId,
      actionType: 'purchase',
      productId: item.productId,
      amount: item.totalPrice,
      externalOrderId: `${paymentOrder.orderId}:${i}`,
      provider,
      providerPaymentId: providerPaymentRef,
      deviceId,
      ipAddress,
      metadata: { saleId: String(sale._id), paymentOrderId: String(paymentOrder._id) },
    }).catch(() => null);
  }

  paymentOrder.meta = {
    ...meta,
    purchaseProcessed: true,
    processedAt: new Date(),
    saleIds,
    purchaseId: `PCH_${Date.now()}`,
  };
  paymentOrder.status = 'paid';
  paymentOrder.paymentId = providerPaymentId;
  if (session) {
    await paymentOrder.save({ session });
  } else {
    await paymentOrder.save();
  }

  const wallet = await buildWalletSummary(userId, session);
  return {
    alreadyProcessed: false,
    purchaseId: paymentOrder.meta.purchaseId,
    saleIds,
    commissions: commissionResults,
    wallet,
  };
};

export const createPurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const items = await normalizeItems(req.body?.items || []);
      const totalAmount = money(items.reduce((acc, item) => acc + item.totalPrice, 0));
      const useWallet = req.body?.useWallet !== false;
      const requestedWalletUse = req.body?.walletUseAmount;

      const wallet = await getWalletBalances(req.user._id, session);
      const maxWalletUse = useWallet ? Math.min(wallet.main, totalAmount) : 0;
      const walletDebit =
        requestedWalletUse === undefined || requestedWalletUse === null
          ? maxWalletUse
          : Math.min(maxWalletUse, Math.max(0, money(requestedWalletUse)));
      const externalPayable = money(totalAmount - walletDebit);

      const idempotencyKey = String(req.headers['x-idempotency-key'] || req.body?.idempotencyKey || '').trim();
      if (!idempotencyKey) {
        const err = new Error('idempotencyKey is rigidly required to prevent double requests');
        err.statusCode = 400;
        throw err;
      }

      const existingOrder = await PaymentOrder.findOne({ 'meta.idempotencyKey': idempotencyKey, user: req.user._id }).session(session);
      if (existingOrder) {
        if (existingOrder.status === 'paid' && existingOrder.meta?.purchaseProcessed) {
          result = {
            status: 200,
            data: {
              mode: 'wallet_only',
              completed: true,
              orderId: existingOrder.orderId,
              purchaseId: existingOrder.meta.purchaseId,
            }
          };
          return;
        }
        result = {
          status: 200,
          data: {
            mode: 'external',
            provider: existingOrder.provider,
            paymentSessionId: existingOrder.meta.paymentSessionId || '',
            orderId: existingOrder.orderId,
            amount: existingOrder.amount,
            totalAmount: existingOrder.meta.totalAmount,
            walletDebit: existingOrder.meta.walletDebit,
            currency: 'INR'
          }
        };
        return;
      }

      const meta = {
        items: items.map((item) => ({
          productId: String(item.productId),
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sellerId: String(item.sellerId),
          source: item.source,
        })),
        totalAmount,
        walletDebit,
        externalPayable,
        deviceId: extractDeviceId(req),
        ipAddress: extractIpAddress(req),
        purchaseProcessed: false,
        idempotencyKey,
      };

      if (externalPayable <= 0) {
        const walletOrderArr = await PaymentOrder.create([{
          user: req.user._id,
          provider: 'wallet',
          purpose: 'purchase_checkout',
          amount: totalAmount,
          currency: 'INR',
          orderId: `wallet_${Date.now()}_${String(req.user._id).slice(-6)}`,
          status: 'paid',
          paymentId: `wallet_${Date.now()}`,
          meta,
        }], { session });
        const walletOrder = walletOrderArr[0];

        const processed = await processPurchase({
          userId: req.user._id,
          paymentOrder: walletOrder,
          providerPaymentId: walletOrder.paymentId,
          provider: 'wallet',
        }, { session });

        result = {
          status: 200,
          data: {
            mode: 'wallet_only',
            completed: true,
            orderId: walletOrder.orderId,
            purchaseId: processed.purchaseId,
            wallet: processed.wallet,
          }
        };
        return;
      }

      // Use Cashfree as default
      const cfOrder = await createCashfreeOrder({
        orderId: `cf_${Date.now()}_${String(req.user._id).slice(-6)}`,
        orderAmount: externalPayable,
        customerId: req.user._id,
        customerPhone: req.user.phone,
        customerEmail: req.user.email,
        orderNote: `Purchase for ${items.length} items`
      });

      meta.paymentSessionId = cfOrder.payment_session_id;
      await PaymentOrder.create([{
        user: req.user._id,
        provider: 'cashfree',
        purpose: 'purchase_checkout',
        amount: externalPayable,
        currency: 'INR',
        orderId: cfOrder.order_id,
        status: 'created',
        meta,
      }], { session });

      result = {
        status: 200,
        data: {
          mode: 'external',
          provider: 'cashfree',
          paymentSessionId: cfOrder.payment_session_id,
          orderId: cfOrder.order_id,
          amount: externalPayable,
          totalAmount,
          walletDebit,
          currency: 'INR'
        }
      };
    });

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Could not create purchase order' });
  } finally {
    session.endSession();
  }
};

const finalizePurchaseFromVerify = async ({ userId, orderId, paymentId, signature, isPublic }) => {
  if (!orderId || !paymentId || !signature) {
    const err = new Error('Missing Razorpay verification fields');
    err.statusCode = 400;
    throw err;
  }
  const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
  if (!ok) {
    const err = new Error('Invalid payment signature');
    err.statusCode = 400;
    throw err;
  }

  const query = {
    provider: 'razorpay',
    purpose: 'purchase_checkout',
    orderId,
  };
  if (!isPublic) query.user = userId;

  const po = await PaymentOrder.findOne(query);
  if (!po) {
    const err = new Error('Purchase order not found');
    err.statusCode = 404;
    throw err;
  }

  const session = await mongoose.startSession();
  let processed;
  
  try {
    await session.withTransaction(async () => {
        processed = await processPurchase({
          userId: po.user,
          paymentOrder: po,
          providerPaymentId: paymentId,
          provider: 'razorpay',
        }, { session });
    });
  } finally {
    session.endSession();
  }

  return { po, processed };
};

export const verifyPurchasePayment = async (req, res) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || '').trim();
    const signature = String(req.body?.razorpay_signature || '').trim();
    const { processed } = await finalizePurchaseFromVerify({
      userId: req.user._id,
      orderId,
      paymentId,
      signature,
      isPublic: false,
    });
    return res.json({
      message: processed.alreadyProcessed ? 'Already processed' : 'Purchase completed',
      purchaseId: processed.purchaseId,
      wallet: processed.wallet || null,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Purchase verification failed' });
  }
};

export const verifyPurchasePaymentPublic = async (req, res) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || '').trim();
    const signature = String(req.body?.razorpay_signature || '').trim();
    const { processed } = await finalizePurchaseFromVerify({
      userId: null,
      orderId,
      paymentId,
      signature,
      isPublic: true,
    });
    return res.json({
      message: processed.alreadyProcessed ? 'Already processed' : 'Purchase completed',
      purchaseId: processed.purchaseId,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ message: error.message || 'Purchase verification failed' });
  }
};

export const getPurchaseOrderStatus = async (req, res) => {
  const orderId = String(req.params?.orderId || '').trim();
  if (!orderId) return res.status(400).json({ message: 'orderId is required' });

  const po = await PaymentOrder.findOne({
    user: req.user._id,
    purpose: 'purchase_checkout',
    orderId,
  });
  if (!po) return res.status(404).json({ message: 'Order not found' });

  return res.json({
    orderId: po.orderId,
    status: po.status,
    purchaseProcessed: !!po.meta?.purchaseProcessed,
    purchaseId: po.meta?.purchaseId || null,
    totalAmount: po.meta?.totalAmount || po.amount,
    walletDebit: po.meta?.walletDebit ?? 0,
    externalPayable: po.meta?.externalPayable || po.amount,
  });
};

export const purchaseCheckoutPage = async (req, res) => {
  const orderId = String(req.query?.orderId || '').trim();
  if (!orderId) return res.status(400).send('orderId is required');

  const po = await PaymentOrder.findOne({
    provider: 'cashfree',
    purpose: 'purchase_checkout',
    orderId,
  });
  if (!po) return res.status(404).send('Order not found');

  const cfOrder = await getCashfreeOrder(orderId);
  const sessionId = cfOrder.payment_session_id;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amezing Pay - Secure Checkout</title>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    <style>
      body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#0b1220;color:#e2e8f0;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
      .card{width:min(520px,92vw);background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.25);border-radius:18px;padding:22px;text-align:center}
      .title{font-weight:700;font-size:18px}
      .muted{color:rgba(226,232,240,0.72);font-size:13px;margin-top:6px}
      .btn{margin-top:18px;width:100%;height:48px;border-radius:14px;border:0;cursor:pointer;background:#2563eb;color:#fff;font-weight:700}
      .status{margin-top:14px;font-size:13px;color:rgba(226,232,240,0.8)}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Secure Checkout</div>
      <div class="muted">Order: ${orderId}</div>
      <div class="muted">Payable now: INR ${Number(po.amount ?? 0).toFixed(2)}</div>
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
};

// Backward-compatible generic order API
export const createOrder = async (req, res) => {
  try {
    const amount = money(req.body?.amount);
    if (!(amount > 0)) return res.status(400).json({ message: 'amount must be > 0' });
    // Use Cashfree
    const cfOrder = await createCashfreeOrder({
      orderId: `cf_gen_${Date.now()}_${String(req.user._id).slice(-6)}`,
      orderAmount: amount,
      customerId: req.user._id,
      customerPhone: req.user.phone,
      customerEmail: req.user.email
    });

    // Create a generic topup order for this
    await PaymentOrder.create({
      user: req.user._id,
      provider: 'cashfree',
      purpose: 'wallet_topup',
      amount: amount,
      currency: 'INR',
      orderId: cfOrder.order_id,
      status: 'created',
    });

    return res.json({
      ...cfOrder,
      provider: 'cashfree'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not create order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};
    const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!ok) return res.status(400).json({ message: 'Invalid signature sent!' });
    return res.status(200).json({ message: 'Payment verified successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Verification failed' });
  }
};

export const razorpayWebhook = async (req, res) => {
  const eventId = String(req.headers['x-razorpay-event-id'] || '').trim();
  const signature = String(req.headers['x-razorpay-signature'] || '').trim();
  
  try {
    if (!eventId) {
      return res.status(400).send('Missing event id');
    }
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    // 1. Audit Log - Immediate Receipt
    let webhookLog;
    try {
        webhookLog = await WebhookLog.create({
            eventId,
            eventType: req.body.event,
            payload: req.body,
            ipAddress: extractIpAddress(req),
            status: 'received'
        });
    } catch (err) {
        if (err.code === 11000) {
            logger.info(`[PAYMENT WEBHOOK] Duplicate event ignored: ${eventId}`);
            return res.status(200).send('Duplicate event');
        }
        throw err;
    }

    // 2. Signature Verification (using rawBody)
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    let verified;
    try {
      verified = verifyRazorpayWebhook({ rawBody: req.rawBody, secret, signature });
    } catch (e) {
      webhookLog.status = 'failed';
      webhookLog.error = e?.message || 'Signature verification error';
      await webhookLog.save();
      return res.status(e?.statusCode || 400).send(webhookLog.error);
    }

    if (!verified.ok) {
      webhookLog.status = 'failed';
      webhookLog.error = 'Invalid signature';
      await webhookLog.save();
      logger.warn(`[PAYMENT WEBHOOK] Invalid signature for event: ${eventId}`);
      return res.status(400).send('Invalid signature');
    }

    // 3. Process Only Captured Payments
    if (!req.body || typeof req.body !== 'object' || typeof req.body.event !== 'string') {
      webhookLog.status = 'failed';
      webhookLog.error = 'Malformed webhook payload';
      await webhookLog.save();
      return res.status(400).send('Malformed payload');
    }

    if (req.body.event !== 'payment.captured') {
      webhookLog.status = 'processed';
      await webhookLog.save();
      return res.status(200).send('Event ignored');
    }

    const payment = req.body?.payload?.payment?.entity;
    if (!payment || typeof payment !== 'object') {
      webhookLog.status = 'failed';
      webhookLog.error = 'Missing payment entity';
      await webhookLog.save();
      return res.status(400).send('Malformed payload');
    }
    const orderId = payment.order_id;
    const paymentId = payment.id;

    if (!orderId) {
      webhookLog.status = 'processed';
      await webhookLog.save();
      return res.status(200).send('No order id');
    }

    const po = await PaymentOrder.findOne({ orderId, provider: 'razorpay' });
    if (!po) {
      webhookLog.status = 'failed';
      webhookLog.error = 'Order not found';
      await webhookLog.save();
      return res.status(200).send('Order not found');
    }

    if (po.status === 'paid') {
      webhookLog.status = 'processed';
      await webhookLog.save();
      return res.status(200).send('Already processed');
    }

    // 4. Atomic Transaction Processing
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (po.purpose === 'wallet_topup') {
          po.status = 'paid';
          po.paymentId = paymentId;
          await po.save({ session });
          
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
          }, { session });
        } else if (po.purpose === 'purchase_checkout') {
          await processPurchase({
            userId: po.user,
            paymentOrder: po,
            providerPaymentId: paymentId,
            provider: 'razorpay',
          }, { session });
        }
        
        webhookLog.status = 'processed';
        await webhookLog.save({ session });
        
        await session.commitTransaction();
        return res.status(200).json({ success: true });
    } catch (e) {
        await session.abortTransaction();
        if (String(e?.code) === '11000') {
           return res.status(200).send('Already processed (Idempotency)');
        }
        throw e;
    } finally {
        session.endSession();
    }
    
  } catch (error) {
    logger.error(`[PAYMENT WEBHOOK ERROR] ${error.message}`, { stack: error.stack, eventId });
    return res.status(500).send('Server Error');
  }
};

export const cashfreeWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBody = req.rawBody; // Assumes rawBody is available via middleware

        // Verify Signature
        const secretKey = env.CASHFREE_SECRET_KEY;
        const data = timestamp + rawBody;
        const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(data)
            .digest('base64');

        const a = Buffer.from(String(signature || ''), 'utf8');
        const b = Buffer.from(expectedSignature, 'utf8');
        const isValid = (a.length === b.length) && crypto.timingSafeEqual(a, a.length === b.length ? b : a);

        if (!isValid) {
            logger.warn('[CASHFREE WEBHOOK] Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        let event;
        try {
            event = JSON.parse(rawBody);
        } catch (parseError) {
            logger.error('[CASHFREE WEBHOOK] Invalid JSON payload');
            return res.status(400).send('Invalid payload');
        }
        const { type, data: eventData } = event;

        // Generate a unique event ID for deduplication
        const cfPaymentId = eventData?.payment?.cf_payment_id;
        const cfOrderId = eventData?.order?.order_id;
        const eventId = `cf_${type}_${cfOrderId}_${cfPaymentId || Date.now()}`;

        // Duplicate event guard — reject if already processed
        let webhookLog;
        try {
            webhookLog = await WebhookLog.create({
                provider: 'cashfree',
                eventId,
                eventType: type || 'unknown',
                payload: event,
                ipAddress: extractIpAddress(req),
                status: 'received',
            });
        } catch (err) {
            if (String(err?.code) === '11000') {
                logger.info(`[CASHFREE WEBHOOK] Duplicate event ignored: ${eventId}`);
                return res.status(200).send('Duplicate event');
            }
            throw err;
        }

        if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = eventData.order.order_id;
            const paymentId = eventData.payment.cf_payment_id;

            const po = await PaymentOrder.findOne({ orderId, provider: 'cashfree' });
            if (!po) {
                logger.error(`[CASHFREE WEBHOOK] Order not found: ${orderId}`);
                webhookLog.status = 'failed';
                webhookLog.error = 'Order not found';
                await webhookLog.save();
                return res.status(200).send('Order not found');
            }

            if (po.status === 'paid') {
                webhookLog.status = 'processed';
                await webhookLog.save();
                return res.status(200).send('Already processed');
            }

            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                if (po.purpose === 'wallet_topup') {
                    po.status = 'paid';
                    po.paymentId = String(paymentId);
                    await po.save({ session });

                    await createLedgerEntry({
                        user: po.user,
                        wallet: 'main',
                        direction: 'credit',
                        source: 'topup',
                        provider: 'cashfree',
                        providerOrderId: orderId,
                        providerPaymentId: String(paymentId),
                        amount: po.amount,
                        title: 'Wallet Top-up (Cashfree)',
                        type: 'income',
                        category: 'topup',
                        status: 'success',
                        idempotencyKey: `topup:cf:${orderId}:${paymentId}`,
                    }, { session });
                } else if (po.purpose === 'purchase_checkout') {
                    await processPurchase({
                        userId: po.user,
                        paymentOrder: po,
                        providerPaymentId: String(paymentId),
                        provider: 'cashfree',
                    }, { session });
                }

                webhookLog.status = 'processed';
                await webhookLog.save({ session });

                await session.commitTransaction();
                return res.status(200).json({ success: true });
            } catch (e) {
                await session.abortTransaction();
                if (String(e?.code) === '11000') {
                    return res.status(200).send('Already processed (Idempotency)');
                }
                throw e;
            } finally {
                session.endSession();
            }
        }

        webhookLog.status = 'processed';
        await webhookLog.save();
        return res.status(200).send('Event received');
    } catch (error) {
        logger.error(`[CASHFREE WEBHOOK ERROR] ${error.message}`, { stack: error.stack });
        return res.status(500).send('Server Error');
    }
};

