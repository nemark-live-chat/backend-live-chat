try {
    console.log('Attempting to require auth.routes.js...');
    require('./src/modules/auth/auth.routes.js');
    console.log('Successfully required auth.routes.js');
} catch (error) {
    console.error('Error requiring auth.routes.js:', error);
}
