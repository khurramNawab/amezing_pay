import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { recordCompletedSale } from '../controllers/saleController.js';
import validate from '../middleware/validatorMiddleware.js';
import { recordSaleSchema } from '../validations/saleValidation.js';

const router = express.Router();

router.post('/complete', protect, validate(recordSaleSchema), recordCompletedSale);

export default router;
