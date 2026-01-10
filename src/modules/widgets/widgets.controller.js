const service = require('./widgets.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');

// Widget script is served at /api/embed/widget.js
// Public endpoints are at /api/public/widgets/...
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'http://localhost:3001';
const WIDGET_SCRIPT_PATH = '/api/embed/widget.js';

const generateEmbedCode = (siteKey) => {
  const scriptUrl = `${PUBLIC_HOST}${WIDGET_SCRIPT_PATH}`;
  return {
    scriptUrl,
    embedScript: `<script async src="${scriptUrl}" data-site-key="${siteKey}" data-api-base="${PUBLIC_HOST}"></script>`
  };
};

const create = asyncHandler(async (req, res) => {
  const widget = await service.create(req.workspaceKey, req.body);
  const embed = generateEmbedCode(widget.SiteKey);

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

  const embed = generateEmbedCode(widget.SiteKey);
  res.status(200).json({ status: 'success', data: embed });
});

/**
 * List all widgets for workspace
 */
const list = asyncHandler(async (req, res) => {
  const widgets = await service.list(req.workspaceKey);

  // Parse JSON fields for each widget
  const parsedWidgets = widgets.map(widget => ({
    widgetId: widget.WidgetId,
    widgetKey: widget.WidgetKey,
    siteKey: widget.SiteKey,
    name: widget.Name,
    allowedDomains: JSON.parse(widget.AllowedDomains || '[]'),
    theme: JSON.parse(widget.Theme || '{}'),
    status: widget.Status,
    createdAt: widget.CreatedAt,
    updatedAt: widget.UpdatedAt
  }));

  res.status(200).json({
    status: 'success',
    data: {
      widgets: parsedWidgets
    }
  });
});

module.exports = {
  create,
  getOne,
  update,
  getEmbed,
  list
};
