import Joi from 'joi';

export const createTicketSchema = Joi.object({
  subject: Joi.string().trim().max(200).allow(''),
  message: Joi.string().trim().min(1).max(5000).required(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
}).unknown(true);

