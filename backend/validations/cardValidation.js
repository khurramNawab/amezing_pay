import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const createCardSchema = Joi.object({
  templateId: objectId.required(),
  name: Joi.string().trim().min(1).max(120).required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  email: Joi.string().email().lowercase().trim().required(),
  role: Joi.string().trim().min(1).max(120).required(),
  address: Joi.string().allow('').max(500),
  profileImage: Joi.string().allow('').max(2000),
  companyName: Joi.string().allow('').max(200),
  socialLinks: Joi.object({
    linkedin: Joi.string().allow('').max(2000),
    twitter: Joi.string().allow('').max(2000),
    website: Joi.string().allow('').max(2000),
    instagram: Joi.string().allow('').max(2000),
    whatsapp: Joi.string().allow('').max(2000),
    youtube: Joi.string().allow('').max(2000),
  }).unknown(true),
  businessInfo: Joi.object({
    name: Joi.string().allow('').max(200),
    category: Joi.string().allow('').max(200),
    address: Joi.string().allow('').max(500),
    description: Joi.string().allow('').max(2000),
  }).unknown(true),
  payment: Joi.object({
    upiId: Joi.string().allow('').max(320),
    qrImageUrl: Joi.string().allow('').max(2000),
  }).unknown(true),
  products: Joi.array()
    .items(
      Joi.object({
        imageUrl: Joi.string().trim().min(1).max(2000).required(),
        title: Joi.string().allow('').max(200),
      }).unknown(true),
    )
    .max(5),
}).unknown(true);

