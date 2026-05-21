import express from 'express';
import {
    createOrder,
    verifyPayment,
    createPurchaseOrder,
    verifyPurchasePayment,
    verifyPurchasePaymentPublic,
    getPurchaseOrderStatus,
    purchaseCheckoutPage,
    razorpayWebhook,
    cashfreeWebhook,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validatorMiddleware.js';
import { genericOrderSchema, verifyPaymentSchema, purchaseOrderSchema } from '../validations/paymentValidation.js';

const router = express.Router();

router.post('/create-order', protect, validate(genericOrderSchema), createOrder);
router.post('/verify-payment', protect, validate(verifyPaymentSchema), verifyPayment);
router.post('/purchase/create-order', protect, validate(purchaseOrderSchema), createPurchaseOrder);
router.post('/purchase/verify', protect, validate(verifyPaymentSchema), verifyPurchasePayment);
router.post('/purchase/verify-public', validate(verifyPaymentSchema), verifyPurchasePaymentPublic);
router.get('/purchase/status/:orderId', protect, getPurchaseOrderStatus);
router.get('/checkout', purchaseCheckoutPage);
router.post('/webhook/razorpay', razorpayWebhook);
router.post('/webhook/cashfree', cashfreeWebhook);

export default router;

