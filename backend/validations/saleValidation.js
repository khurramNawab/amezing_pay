import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const recordSaleSchema = Joi.object({
  amount: Joi.number().positive().required(),
  buyerId: objectId.allow(null, ''),
  title: Joi.string().trim().max(200).allow(''),
  provider: Joi.string().trim().max(50).allow(''),
  providerPaymentId: Joi.string().trim().max(200).allow(''),
  productId: objectId.allow(null, ''),
  meta: Joi.object().unknown(true).default({}),
}).unknown(true);

