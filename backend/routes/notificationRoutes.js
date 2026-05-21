import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getUserNotifications, clearUserNotifications, dismissNotification } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getUserNotifications);
router.delete('/', protect, clearUserNotifications);
router.delete('/:id', protect, dismissNotification);

export default router;
