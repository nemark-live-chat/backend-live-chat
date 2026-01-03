const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const message = error.details.map(detail => detail.message).join(', ');
    return next(new AppError(`Validation Error: ${message}`, 400));
  }
  
  next();
};

module.exports = validate;
