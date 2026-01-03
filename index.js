const { start } = require('./src/bootstrap/server');
// The server.js (if it exports a start function or runs automatically)
// Based on previous read, server.js runs start() at the end automatically if not imported? 
// Let's re-read server.js. It calls start() at line 43.
// So we just need to require it.

require('./src/bootstrap/server');

