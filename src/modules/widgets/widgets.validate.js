const Joi = require('joi');

// Domain pattern: accepts "localhost:3000", "example.com", or "https://example.com"
const domainPattern = /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)*(:\d+)?(\/.*)?$/;

const createWidget = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  allowedDomains: Joi.array().items(
    Joi.string().pattern(domainPattern).message('Must be a valid domain or URL')
  ).min(1).required(),
  theme: Joi.object({
    title: Joi.string().allow('').optional(),
    subtitle: Joi.string().allow('').optional(),
    color: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).required(),
    position: Joi.string().valid('br', 'bl').required(),
    autoOpen: Joi.boolean().default(false)
  }).required()
});

const updateWidget = Joi.object({
  name: Joi.string().min(1).max(120),
  status: Joi.number().valid(1, 2), // 1=Enabled, 2=Disabled
  allowedDomains: Joi.array().items(
    Joi.string().pattern(domainPattern).message('Must be a valid domain or URL')
  ),
  theme: Joi.object({
    title: Joi.string().allow('').optional(),
    subtitle: Joi.string().allow('').optional(),
    welcomeMessage: Joi.string().allow('').optional(),
    color: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).optional(),
    mainColor: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).optional(),
    position: Joi.string().valid('br', 'bl').optional(),
    autoOpen: Joi.boolean().optional()
  })
});

module.exports = {
  createWidget,
  updateWidget
};
