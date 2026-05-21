import express from 'express';
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import { submitKycDocuments, reviewKyc, getMyKycDocument } from '../controllers/kycController.js';
import validate from '../middleware/validatorMiddleware.js';
import { submitKycSchema, reviewKycSchema, kycDocumentIdParamsSchema } from '../validations/kycValidation.js';

const router = express.Router();

router.post('/submit', protect, validate(submitKycSchema), submitKycDocuments);
router.get('/documents/:id', protect, validate(kycDocumentIdParamsSchema, 'params'), getMyKycDocument);
router.post('/review/:userId', protect, adminProtect, validate(reviewKycSchema), reviewKyc);

export default router;
