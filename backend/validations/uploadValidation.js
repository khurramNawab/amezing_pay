import Joi from 'joi';

export const uploadImageSchema = Joi.object({
  file: Joi.string().trim().min(1).required(),
  folder: Joi.string().trim().max(200).allow(''),
}).unknown(true);

export const uploadKycSchema = Joi.object({
  docType: Joi.string().valid('aadhar_front', 'aadhar_back', 'pan_card', 'selfie').required(),
}).unknown(true);
