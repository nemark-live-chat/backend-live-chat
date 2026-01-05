const service = require('./widgets.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');

const PUBLIC_WIDGET_HOST = process.env.PUBLIC_WIDGET_HOST || 'http://localhost:3001';
const PUBLIC_API_HOST = process.env.PUBLIC_API_HOST || PUBLIC_WIDGET_HOST;
const WIDGET_SCRIPT_PATH = process.env.WIDGET_SCRIPT_PATH || '/widget.js';

const generateEmbedCode = (widgetId) => {
  const scriptUrl = `${PUBLIC_WIDGET_HOST}${WIDGET_SCRIPT_PATH}`;
  return {
    scriptUrl,
    embedScript: `<script async src="${scriptUrl}" data-widget-id="${widgetId}" data-api-base="${PUBLIC_API_HOST}"></script>`
  };
};

const create = asyncHandler(async (req, res) => {
  const widget = await service.create(req.workspaceKey, req.body);
  const embed = generateEmbedCode(widget.WidgetId);
  
  res.status(201).json({
    status: 'success',
    data: {
      ...widget,
      ...embed,
      AllowedDomains: JSON.parse(widget.AllowedDomains),
      Theme: JSON.parse(widget.Theme)
    }
  });
});

const getOne = asyncHandler(async (req, res) => {
  const { widgetId } = req.params;
  const widget = await service.getById(req.workspaceKey, widgetId);
  
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      ...widget,
      AllowedDomains: JSON.parse(widget.AllowedDomains),
      Theme: JSON.parse(widget.Theme)
    }
  });
});

const update = asyncHandler(async (req, res) => {
  const { widgetId } = req.params;
  const widget = await service.update(req.workspaceKey, widgetId, req.body);
  
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      ...widget,
      AllowedDomains: JSON.parse(widget.AllowedDomains),
      Theme: JSON.parse(widget.Theme)
    }
  });
});

const getEmbed = asyncHandler(async (req, res) => {
  const { widgetId } = req.params;
  // Verify existence and access
  const widget = await service.getById(req.workspaceKey, widgetId);
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  const embed = generateEmbedCode(widgetId);
  res.status(200).json({ status: 'success', data: embed });
});

module.exports = {
  create,
  getOne,
  update,
  getEmbed
};
