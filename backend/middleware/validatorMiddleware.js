/**
 * Generic Joi validation middleware
 * @param {Object} schema - Joi schema object
 * @param {String} property - req property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Include all errors
            allowUnknown: true, // Backward-compatible: extra keys won't hard-fail
            stripUnknown: true,  // Ensure unknown keys never reach controllers
            convert: true,
        });

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ 
                success: false,
                message: 'Validation Error',
                errors: errorMessage
            });
        }

        // Replace req[property] with validated/stripped value
        try {
            if (property === 'body') req.body = value;
            else if (property === 'query') req.query = value;
            else if (property === 'params') req.params = value;
            else req[property] = value;
        } catch (e) {
            // If the property is read-only (getter only), use Object.defineProperty
            Object.defineProperty(req, property, {
                value: value,
                enumerable: true,
                writable: true,
                configurable: true
            });
        }

        next();
    };
};

export default validate;
