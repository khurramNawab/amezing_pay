import express from 'express';
import { getEarningsSummary, getEarningsBreakdown, getTransactionLogs } from '../controllers/earningsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getEarningsSummary);

router.route('/breakdown')
    .get(protect, getEarningsBreakdown);

router.route('/payouts')
    .get(protect, getTransactionLogs);

export default router;
