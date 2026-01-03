const swaggerAutogen = require('swagger-autogen')();
const path = require('path');

const doc = {
  info: { title: 'Test API', description: 'Test' },
  host: 'localhost:3000',
  schemes: ['http'],
};

const outputFile = path.join(__dirname, 'test_swagger_output.json');
const endpointsFiles = [path.join(__dirname, 'src/simple.routes.js')];

console.log('Generating swagger for:', endpointsFiles);

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('Success!');
});
