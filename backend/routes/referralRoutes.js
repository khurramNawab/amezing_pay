import express from 'express';
import {
    getReferrals,
    createReferral,
    getReferralLink,
    captureClick,
    getReferralDashboard,
    createConversion,
} from '../controllers/referralController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validatorMiddleware.js';
import { createReferralSchema, captureClickSchema, createConversionSchema } from '../validations/referralValidation.js';

const router = express.Router();

router.route('/')
    .get(protect, getReferrals)
    .post(protect, validate(createReferralSchema), createReferral);

router.get('/dashboard', protect, getReferralDashboard);
router.get('/link/:productId', protect, getReferralLink);
router.post('/click', validate(captureClickSchema), captureClick);
router.get('/click', captureClick);
router.post('/conversions', protect, validate(createConversionSchema), createConversion);

export default router;
