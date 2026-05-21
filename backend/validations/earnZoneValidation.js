import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const submitQuizSchema = Joi.object({
  sessionId: objectId.required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: objectId.required(),
        selectedIndex: Joi.number().integer().min(0).required(),
      }).unknown(true),
    )
    .min(1)
    .required(),
}).unknown(true);

export const adRewardSchema = Joi.object({
  adId: Joi.string().trim().min(8).regex(/^[a-zA-Z0-9_\-]+$/).required().max(200),
  adVerificationToken: Joi.string().trim().max(500).optional(),
}).unknown(true);

