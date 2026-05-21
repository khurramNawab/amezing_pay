import express from 'express';
import { getTemplates, seedTemplates } from '../controllers/templateController.js';
import validate from '../middleware/validatorMiddleware.js';
import { seedTemplatesSchema } from '../validations/templateValidation.js';

const router = express.Router();

router.get('/', getTemplates);
router.post('/seed', validate(seedTemplatesSchema), seedTemplates);

export default router;
