import Joi from 'joi';

export const topupOrderSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be greater than 0'
    })
});

export const verifyTopupSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
});

export const withdrawSchema = Joi.object({
    amount: Joi.number().positive().required(),
    method: Joi.string().valid('upi', 'bank').default('upi'),
    upiId: Joi.string().trim().when('method', {
        is: 'upi',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    idempotencyKey: Joi.string().trim().required()
});

export const addBankSchema = Joi.object({
    type: Joi.string().valid('bank', 'upi').required(),
    accountHolder: Joi.string().trim().max(100).required(),
    bankName: Joi.string().trim().max(100).when('type', {
        is: 'bank',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }),
    accountNumber: Joi.string().trim().min(9).max(18).when('type', {
        is: 'bank',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }),
    ifsc: Joi.string().trim().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).when('type', {
        is: 'bank',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }).messages({
        'string.pattern.base': 'Invalid IFSC Code format'
    }),
    upiId: Joi.string().trim().when('type', {
        is: 'upi',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }),
    isPrimary: Joi.boolean().default(false)
});
