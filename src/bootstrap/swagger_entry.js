const createApp = require('./express');
const app = createApp();

console.log('Swagger Entry: App initialized for route detection');

// MOCKING LISTEN to trigger swagger-autogen
const server = app.listen(0, () => {
    console.log('Swagger Entry: Fake server listening for detection...');
    // We don't need to keep it open long
    setTimeout(() => {
        server.close();
        // We do NOT exit process here, let swagger-autogen finish its promise
    }, 2000); 
});

module.exports = app;
