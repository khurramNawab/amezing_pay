import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(1).max(200).required(),
}).unknown(true);

export const setUserBlockedSchema = Joi.object({
  isBlocked: Joi.boolean().required(),
}).unknown(true);

export const setUserCommissionSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  sellerPercent: Joi.number().min(0).max(100).allow(null),
  uplinePercent: Joi.number().min(0).max(100).allow(null),
}).unknown(true);

export const templateCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  styleType: Joi.string().trim().min(1).required(),
  isPremium: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  category: Joi.string().trim().allow('').optional(),
  priceInr: Joi.number().min(0).optional(),
  thumbnailUrl: Joi.string().allow('').max(2000).optional(),
  layoutConfig: Joi.object().unknown(true).optional(),
}).unknown(true);

export const templateUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).optional(),
  styleType: Joi.string().trim().min(1).optional(),
  isPremium: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  category: Joi.string().trim().allow('').optional(),
  priceInr: Joi.number().min(0).optional(),
  thumbnailUrl: Joi.string().allow('').max(2000).optional(),
  layoutConfig: Joi.object().unknown(true).optional(),
}).unknown(true);

export const visibilityToggleSchema = Joi.object({
  isActive: Joi.boolean().required(),
}).unknown(true);

export const updateSettingsSchema = Joi.object({}).unknown(true);

export const updateAdsConfigSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  banner: Joi.boolean().optional(),
  interstitial: Joi.boolean().optional(),
  rewarded: Joi.boolean().optional(),
  adsRevenue: Joi.number().min(0).optional(),
}).unknown(true);

export const notificationCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  targetUser: objectId.allow(null, '').optional(),
}).unknown(true);

export const notificationUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  message: Joi.string().trim().min(1).max(5000).optional(),
}).unknown(true);

export const ticketUpdateSchema = Joi.object({
  status: Joi.string().trim().min(1).max(50).optional(),
  adminNote: Joi.string().trim().allow('').max(2000).optional(),
}).unknown(true);

export const withdrawalProcessSchema = Joi.object({
  providerPayoutId: Joi.string().trim().allow('', null).max(200).optional(),
  note: Joi.string().trim().allow('', null).max(2000).optional(),
}).unknown(true);

export const withdrawalRejectSchema = Joi.object({
  reason: Joi.string().trim().allow('', null).max(500).optional(),
  note: Joi.string().trim().allow('', null).max(2000).optional(),
}).unknown(true);

export const quizQuestionCreateSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(2000).required(),
  options: Joi.array().items(Joi.string().trim().min(1).max(500)).min(2).max(10).required(),
  correctIndex: Joi.number().integer().min(0).required(),
  difficulty: Joi.string().trim().allow('').max(50).optional(),
  category: Joi.string().trim().allow('').max(100).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

export const quizQuestionUpdateSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(2000).optional(),
  options: Joi.array().items(Joi.string().trim().min(1).max(500)).min(2).max(10).optional(),
  correctIndex: Joi.number().integer().min(0).optional(),
  difficulty: Joi.string().trim().allow('').max(50).optional(),
  category: Joi.string().trim().allow('').max(100).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

export const productCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('').max(5000).optional(),
  price: Joi.number().min(0).required(),
  commission: Joi.string().allow('').max(200).optional(),
  category: Joi.string().allow('').max(100).optional(),
  imageUrl: Joi.string().allow('').max(2000).optional(),
  imageUrls: Joi.array().items(Joi.string().max(2000)).max(3).optional(),
  source: Joi.string().trim().allow('').max(50).optional(),
  platformName: Joi.string().allow('').max(100).optional(),
  platformColor: Joi.string().allow('').max(50).optional(),
  trustBadge: Joi.string().allow('').max(100).optional(),
  shareUrl: Joi.string().allow('').max(2000).optional(),
  originalPrice: Joi.number().min(0).optional(),
  placements: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
  sortOrder: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

export const productUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().allow('').max(5000).optional(),
  price: Joi.number().min(0).optional(),
  commission: Joi.string().allow('').max(200).optional(),
  category: Joi.string().allow('').max(100).optional(),
  imageUrl: Joi.string().allow('').max(2000).optional(),
  imageUrls: Joi.array().items(Joi.string().max(2000)).max(3).optional(),
  source: Joi.string().trim().allow('').max(50).optional(),
  platformName: Joi.string().allow('').max(100).optional(),
  platformColor: Joi.string().allow('').max(50).optional(),
  trustBadge: Joi.string().allow('').max(100).optional(),
  shareUrl: Joi.string().allow('').max(2000).optional(),
  originalPrice: Joi.number().min(0).optional(),
  placements: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
  sortOrder: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

export const approveRejectTransactionSchema = Joi.object({
  reason: Joi.string().trim().allow('', null).max(500).optional(),
}).unknown(true);
