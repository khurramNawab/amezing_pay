import Joi from 'joi';

export const genericOrderSchema = Joi.object({
    amount: Joi.number().positive().required()
});

export const purchaseOrderSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().hex().length(24).required(),
            quantity: Joi.number().integer().min(1).default(1)
        })
    ).min(1).required(),
    useWallet: Joi.boolean().default(true),
    walletUseAmount: Joi.number().min(0)
});

export const verifyPaymentSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
});
