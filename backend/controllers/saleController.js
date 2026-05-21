import Sale from '../models/Sale.js';
import { applyTwoTierCommission } from '../services/commissionService.js';
import { recordAttributedConversion } from '../services/referralEngine.js';
import { extractDeviceId, extractIpAddress } from '../services/fraudService.js';

// @desc    Record a completed sale (webhook/integration entrypoint)
// @route   POST /api/sales/complete
// @access  Private (seller)
export const recordCompletedSale = async (req, res) => {
  try {
    const { amount, buyerId, title, provider, providerPaymentId, meta, productId } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const payload = {
      sellerId: req.user._id,
      buyerId: buyerId || null,
      amount: amt,
      status: 'completed',
      title: typeof title === 'string' ? title.trim() : 'Sale',
      provider: typeof provider === 'string' ? provider.trim() : '',
      providerPaymentId: typeof providerPaymentId === 'string' ? providerPaymentId.trim() : '',
      meta: meta && typeof meta === 'object' ? meta : {},
    };

    let sale;
    try {
      sale = await Sale.create(payload);
    } catch (e) {
      if (String(e?.code) === '11000' && payload.provider && payload.providerPaymentId) {
        sale = await Sale.findOne({ provider: payload.provider, providerPaymentId: payload.providerPaymentId });
      } else {
        throw e;
      }
    }
    if (!sale) return res.status(500).json({ message: 'Could not create or load sale' });

    const commission = await applyTwoTierCommission({
      saleId: sale._id,
      sellerId: sale.sellerId,
      buyerId: sale.buyerId,
      amount: sale.amount,
    });

    let referralConversion = null;
    if (sale.buyerId) {
      const deviceId = extractDeviceId(req);
      const ipAddress = extractIpAddress(req);
      referralConversion = await recordAttributedConversion({
        userId: sale.buyerId,
        actionType: 'purchase',
        productId: productId || null,
        amount: sale.amount,
        externalOrderId: payload.providerPaymentId || '',
        provider: payload.provider || 'internal',
        providerPaymentId: payload.providerPaymentId || '',
        deviceId,
        ipAddress,
        metadata: { saleId: String(sale._id), source: 'sale_complete' },
      }).catch(() => null);
    }

    return res.status(201).json({
      saleId: sale._id,
      commission,
      referralConversion: referralConversion
        ? { orderId: referralConversion.order?._id, commissionsCreated: referralConversion.commissions?.length ?? 0 }
        : null,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server Error' });
  }
};
