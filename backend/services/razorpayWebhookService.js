import crypto from 'crypto';

const toBuffer = (v) => Buffer.from(String(v || ''), 'utf8');

export const timingSafeEqualHex = (aHex, bHex) => {
  const a = toBuffer(aHex);
  const b = toBuffer(bHex);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const computeRazorpayWebhookSignature = ({ rawBody, secret }) => {
  if (!rawBody || typeof rawBody !== 'string') {
    const err = new Error('rawBody is required for webhook signature verification');
    err.statusCode = 400;
    throw err;
  }
  if (!secret) {
    const err = new Error('Webhook secret is required');
    err.statusCode = 500;
    throw err;
  }
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
};

export const verifyRazorpayWebhook = ({ rawBody, secret, signature }) => {
  const sig = String(signature || '').trim();
  if (!sig) {
    const err = new Error('Missing x-razorpay-signature');
    err.statusCode = 400;
    throw err;
  }
  const expected = computeRazorpayWebhookSignature({ rawBody, secret });
  return { ok: timingSafeEqualHex(sig, expected), expected };
};

