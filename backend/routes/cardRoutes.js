import express from 'express';
import { createCard, getCardById, getMyCards, deleteCard } from '../controllers/cardController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validatorMiddleware.js';
import { createCardSchema } from '../validations/cardValidation.js';

const router = express.Router();

router.post('/create', protect, validate(createCardSchema), createCard);
router.get('/mycards', protect, getMyCards);
router.delete('/:id', protect, deleteCard);
router.get('/:id', getCardById); // Public route for sharing

export default router;
