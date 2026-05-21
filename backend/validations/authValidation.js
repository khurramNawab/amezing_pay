import Joi from 'joi';

export const generateOtpSchema = Joi.object({
    identifier: Joi.string().trim().allow('', null),
    email: Joi.string().email().required().lowercase().trim(),
    phone: Joi.string().pattern(/^[0-9+\s-]{10,15}$/).allow('', null),
    password: Joi.string().allow('', null),
    name: Joi.string().trim().max(100).allow('', null),
    optionalEmail: Joi.string().email().allow('', null).lowercase().trim()
});

export const verifyOtpSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    otp: Joi.string().length(6).required(),
    phone: Joi.string().pattern(/^[0-9+\s-]{10,15}$/).allow('', null),
    name: Joi.string().trim().max(100).allow('', null),
    referralCode: Joi.string().alphanum().length(6).uppercase().allow('', null)
});

export const registerSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^[0-9+\s-]{10,15}$/).allow('', null),
    name: Joi.string().trim().max(100).allow('', null),
    referralCode: Joi.string().alphanum().length(6).uppercase().allow('', null)
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required()
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
    name: Joi.string().trim().max(100),
    email: Joi.string().email().lowercase().trim(),
    phone: Joi.string().pattern(/^[0-9+\s-]{10,15}$/)
}).min(1); // At least one field must be provided

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
});

