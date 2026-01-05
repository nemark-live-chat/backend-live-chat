const Joi = require('joi');

const createWidget = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  allowedDomains: Joi.array().items(
    Joi.string().uri({ scheme: [/https?/] })
  ).required(),
  theme: Joi.object({
    title: Joi.string().required(),
    subtitle: Joi.string().allow(''),
    color: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).required(),
    position: Joi.string().valid('br', 'bl').required(),
    autoOpen: Joi.boolean().default(false)
  }).required()
});

const updateWidget = Joi.object({
  name: Joi.string().min(1).max(120),
  status: Joi.number().valid(1, 2), // 1=Enabled, 2=Disabled
  allowedDomains: Joi.array().items(Joi.string().uri()),
  theme: Joi.object({
    title: Joi.string(),
    subtitle: Joi.string().allow(''),
    color: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i),
    position: Joi.string().valid('br', 'bl'),
    autoOpen: Joi.boolean()
  })
});

module.exports = {
  createWidget,
  updateWidget
};
