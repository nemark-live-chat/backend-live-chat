const { connectSql } = require('../infra/sql/pool');
const { connectMongo } = require('../infra/mongo/mongo');
const createApp = require('./express');
const { initSocket } = require('./socket');
const env = require('../config/env');
const http = require('http');

async function start() {
  try {
    // 1. Connect to Databases
    await Promise.all([
      connectSql(),
      connectMongo(),
    ]);

    // 2. Initialize App
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocket(server);

    // 4. Start Server
    server.listen(env.app.port, () => {
      console.log(`Server started on port ${env.app.port} (${env.app.env})`);
      console.log(`API available at http://localhost:${env.app.port}/api`);
      console.log(`Socket.IO available at http://localhost:${env.app.port}`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('Shutting down...');
      server.close(() => {
        console.log('HTTP Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

