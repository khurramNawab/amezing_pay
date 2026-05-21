import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getTransactionLogs } from '../controllers/earningsController.js';

const router = express.Router();

router.get('/', protect, getTransactionLogs);

export default router;

