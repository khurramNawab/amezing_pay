import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const createReferralSchema = Joi.object({
  referredUserId: objectId.required(),
}).unknown(true);

export const captureClickSchema = Joi.object({
  ref: Joi.string().trim().min(1).max(64).required(),
  productId: Joi.string().trim().allow('', null),
  sourcePath: Joi.string().trim().allow('', null).max(2000),
  channel: Joi.string().trim().allow('', null).max(100),
}).unknown(true);

export const createConversionSchema = Joi.object({
  actionType: Joi.string().trim().min(1).max(50).required(),
  productId: Joi.string().trim().allow('', null),
  amount: Joi.number().min(0).required(),
  externalOrderId: Joi.string().trim().allow('', null).max(200),
  provider: Joi.string().trim().allow('', null).max(50),
  providerPaymentId: Joi.string().trim().allow('', null).max(200),
  meta: Joi.object().unknown(true).default({}),
}).unknown(true);

