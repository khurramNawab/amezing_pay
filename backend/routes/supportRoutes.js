import express from 'express';
import { createTicket, getMyTickets } from '../controllers/supportController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validatorMiddleware.js';
import { createTicketSchema } from '../validations/supportValidation.js';

const router = express.Router();

router.post('/', protect, validate(createTicketSchema), createTicket);
router.get('/my', protect, getMyTickets);

export default router;
