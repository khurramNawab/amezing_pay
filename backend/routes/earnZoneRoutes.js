import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getEarnZoneConfig, grantProCardAccess, startQuiz, submitQuiz, processSpin, processAdReward } from '../controllers/earnZoneController.js';
import validate from '../middleware/validatorMiddleware.js';
import { submitQuizSchema, adRewardSchema } from '../validations/earnZoneValidation.js';

const router = express.Router();

router.get('/config', protect, getEarnZoneConfig);
router.post('/pro-card-access/grant', protect, grantProCardAccess);
router.post('/quiz/start', protect, startQuiz);
router.post('/quiz/submit', protect, validate(submitQuizSchema), submitQuiz);
router.post('/spin', protect, processSpin);
router.post('/ad', protect, validate(adRewardSchema), processAdReward);

export default router;
