import Joi from 'joi';

const documentSchema = Joi.object({
    docType: Joi.string().valid('aadhar_front', 'aadhar_back', 'pan_card', 'selfie').required(),
    url: Joi.string().uri(),
    documentId: Joi.string().hex().length(24)
})
  .or('url', 'documentId')
  .unknown(true);

// Backward-compatible:
// - Newer clients may send { documents: [...] }
// - Existing clients may send { docType, url }
export const submitKycSchema = Joi.alternatives().try(
    Joi.object({ documents: Joi.array().items(documentSchema).min(1).required() }).unknown(true),
    documentSchema,
);

export const reviewKycSchema = Joi.object({
    status: Joi.string().valid('verified', 'rejected').required(),
    reason: Joi.string().when('status', {
        is: 'rejected',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
});

export const kycDocumentIdParamsSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
}).unknown(true);
