import express from 'express';
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import { adminLogin, adminMe } from '../controllers/admin/adminAuthController.js';
import { getOverview } from '../controllers/admin/adminAnalyticsController.js';
import { listUsers, setUserBlocked, setUserCommissionOverride, deleteUser } from '../controllers/admin/adminUsersController.js';
import { listCards, setModerationStatus, deleteCardAdmin } from '../controllers/admin/adminCardsController.js';
import { listTemplates, createTemplate, updateTemplate, setTemplateVisibility, deleteTemplate } from '../controllers/admin/adminTemplatesController.js';
import {
  listTransactions,
  approvePendingTransaction,
  rejectPendingTransaction,
} from '../controllers/admin/adminTransactionsController.js';
import { getSettings, updateSettings } from '../controllers/admin/adminSettingsController.js';
import { getAdsConfig, updateAdsConfig } from '../controllers/admin/adminAdsController.js';
import { sendNotification, listNotifications, updateNotification, deleteNotification } from '../controllers/admin/adminNotificationsController.js';
import { listMedia, deleteMedia } from '../controllers/admin/adminMediaController.js';
import { getLeaderboard } from '../controllers/admin/adminCommissionsController.js';
import {
  listWithdrawals,
  markWithdrawalAsProcessing,
  approveWithdrawal,
  rejectWithdrawal,
} from '../controllers/admin/adminWithdrawalsController.js';
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from '../controllers/admin/adminQuizQuestionsController.js';
import {
  listProductsAdmin,
  createProductAdmin,
  updateProductAdmin,
  setProductVisibilityAdmin,
  deleteProductAdmin,
} from '../controllers/admin/adminProductsController.js';
import {
  getAllTickets,
  updateTicketStatus,
  deleteTicket,
} from '../controllers/admin/adminSupportController.js';
import validate from '../middleware/validatorMiddleware.js';
import {
  adminLoginSchema,
  setUserBlockedSchema,
  setUserCommissionSchema,
  templateCreateSchema,
  templateUpdateSchema,
  visibilityToggleSchema,
  updateSettingsSchema,
  updateAdsConfigSchema,
  notificationCreateSchema,
  notificationUpdateSchema,
  ticketUpdateSchema,
  withdrawalProcessSchema,
  withdrawalRejectSchema,
  quizQuestionCreateSchema,
  quizQuestionUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  approveRejectTransactionSchema,
} from '../validations/adminValidation.js';

const router = express.Router();

// Auth
router.post('/auth/login', validate(adminLoginSchema), adminLogin);
router.get('/auth/me', protect, adminProtect, adminMe);

// Analytics
router.get('/analytics/overview', protect, adminProtect, getOverview);

// Users
router.get('/users', protect, adminProtect, listUsers);
router.patch('/users/:id/block', protect, adminProtect, validate(setUserBlockedSchema), setUserBlocked);
router.patch('/users/:id/commission', protect, adminProtect, validate(setUserCommissionSchema), setUserCommissionOverride);
router.delete('/users/:id', protect, adminProtect, deleteUser);

// Cards
router.get('/cards', protect, adminProtect, listCards);
router.patch('/cards/:id/moderation', protect, adminProtect, setModerationStatus);
router.delete('/cards/:id', protect, adminProtect, deleteCardAdmin);

// Templates
router.get('/templates', protect, adminProtect, listTemplates);
router.post('/templates', protect, adminProtect, validate(templateCreateSchema), createTemplate);
router.put('/templates/:id', protect, adminProtect, validate(templateUpdateSchema), updateTemplate);
router.patch('/templates/:id/visibility', protect, adminProtect, validate(visibilityToggleSchema), setTemplateVisibility);
router.delete('/templates/:id', protect, adminProtect, deleteTemplate);

// Transactions
router.get('/transactions', protect, adminProtect, listTransactions);
router.post('/transactions/:id/approve', protect, adminProtect, validate(approveRejectTransactionSchema), approvePendingTransaction);
router.post('/transactions/:id/reject', protect, adminProtect, validate(approveRejectTransactionSchema), rejectPendingTransaction);

// Settings
router.get('/settings', protect, adminProtect, getSettings);
router.put('/settings', protect, adminProtect, validate(updateSettingsSchema), updateSettings);

// Ads
router.get('/ads', protect, adminProtect, getAdsConfig);
router.put('/ads', protect, adminProtect, validate(updateAdsConfigSchema), updateAdsConfig);

// Notifications
router.get('/notifications', protect, adminProtect, listNotifications);
router.post('/notifications', protect, adminProtect, validate(notificationCreateSchema), sendNotification);
router.put('/notifications/:id', protect, adminProtect, validate(notificationUpdateSchema), updateNotification);
router.delete('/notifications/:id', protect, adminProtect, deleteNotification);

// Media
router.get('/media', protect, adminProtect, listMedia);
router.delete('/media/:id', protect, adminProtect, deleteMedia);

// Commissions
router.get('/commissions/leaderboard', protect, adminProtect, getLeaderboard);

// Withdrawals
router.get('/withdrawals', protect, adminProtect, listWithdrawals);
router.post('/withdrawals/:id/process', protect, adminProtect, validate(withdrawalProcessSchema), markWithdrawalAsProcessing);
router.post('/withdrawals/:id/approve', protect, adminProtect, approveWithdrawal);
router.post('/withdrawals/:id/reject', protect, adminProtect, validate(withdrawalRejectSchema), rejectWithdrawal);

// Earn Zone / Quiz Questions
router.get('/quiz/questions', protect, adminProtect, listQuestions);
router.post('/quiz/questions', protect, adminProtect, validate(quizQuestionCreateSchema), createQuestion);
router.put('/quiz/questions/:id', protect, adminProtect, validate(quizQuestionUpdateSchema), updateQuestion);
router.delete('/quiz/questions/:id', protect, adminProtect, deleteQuestion);

// Products (Digital Store / Affiliate)
router.get('/products', protect, adminProtect, listProductsAdmin);
router.post('/products', protect, adminProtect, validate(productCreateSchema), createProductAdmin);
router.put('/products/:id', protect, adminProtect, validate(productUpdateSchema), updateProductAdmin);
router.patch('/products/:id/visibility', protect, adminProtect, validate(visibilityToggleSchema), setProductVisibilityAdmin);
router.delete('/products/:id', protect, adminProtect, deleteProductAdmin);

// Support Tickets
router.get('/tickets', protect, adminProtect, getAllTickets);
router.patch('/tickets/:ticketId', protect, adminProtect, validate(ticketUpdateSchema), updateTicketStatus);
router.delete('/tickets/:ticketId', protect, adminProtect, deleteTicket);

export default router;
