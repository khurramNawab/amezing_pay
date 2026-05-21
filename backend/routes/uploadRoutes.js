import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadImage, uploadKycDocument } from '../controllers/uploadController.js';
import validate from '../middleware/validatorMiddleware.js';
import { uploadImageSchema, uploadKycSchema } from '../validations/uploadValidation.js';
import { uploadSingle, multerErrorHandler } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Backward compatible: supports JSON base64 and multipart file upload.
router.post('/image', protect, uploadSingle('file'), multerErrorHandler, (req, res, next) => {
  // Only run Joi body validation for JSON/base64 clients.
  const isMultipart = String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data');
  if (isMultipart) return next();
  return validate(uploadImageSchema)(req, res, next);
}, uploadImage);

// Fintech-grade KYC upload (does not expose raw URLs)
router.post('/kyc', protect, uploadSingle('file'), multerErrorHandler, validate(uploadKycSchema), uploadKycDocument);

export default router;
