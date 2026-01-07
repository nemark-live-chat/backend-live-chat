const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('../middlewares/error');

module.exports = () => {
  const app = express();

  // Helmet configuration - allow embedding from any origin for widget
  app.use(helmet({
    // Disable X-Frame-Options globally - will be set per-route for embed endpoints
    frameguard: false,
    // Disable CSP - embed endpoints need to work with external scripts
    contentSecurityPolicy: false,
    // Keep other security headers
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS - allow all origins for embed functionality
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false // Cannot use credentials with origin: '*'
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Swagger UI
  const swaggerUi = require('swagger-ui-express');
  const swaggerFile = require('./swagger_output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

  // Routes
  app.use('/api', require('../routes'));

  // 404
  app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
