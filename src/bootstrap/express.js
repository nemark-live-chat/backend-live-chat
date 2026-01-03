const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('../middlewares/error');

module.exports = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
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
