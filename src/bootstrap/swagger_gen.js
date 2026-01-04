console.log('Starting Swagger Config...');
// const swaggerAutogen = require('swagger-autogen')();
const env = require('../config/env');

const doc = {
  swagger: '2.0',
  info: {
    title: 'Live Chat Enterprise API',
    description: 'Enterprise Authentication & Live Chat API',
    version: '1.0.0',
  },
  host: `localhost:${env.app.port}`,
  schemes: ['http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Enter: Bearer <token> (Example: Bearer eyJ...)'
    }
  },
  security: [
    { bearerAuth: [] }
  ],
  paths: {
    "/api/auth/register": {
      "post": {
        "tags": ["Auth"],
        "summary": "Register new user",
        "description": "Register a new user account.",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "schema": {
              "type": "object",
              "properties": {
                "email": { "type": "string" },
                "password": { "type": "string" },
                "firstName": { "type": "string" },
                "lastName": { "type": "string" }
              },
              "required": ["email", "password", "firstName", "lastName"]
            }
          }
        ],
        "responses": {
          "201": { "description": "Created" }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": ["Auth"],
        "summary": "Login",
        "description": "Authenticate user and get tokens.",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "schema": {
              "type": "object",
              "properties": {
                "email": { "type": "string" },
                "password": { "type": "string" }
              },
              "required": ["email", "password"]
            }
          }
        ],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/logout": {
      "post": {
        "tags": ["Auth"],
        "summary": "Logout",
        "description": "Revoke current refresh token.",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "schema": {
                    "type": "object",
                     "properties": {
                        "refreshToken": { "type": "string" }
                     }
                }
            }
        ],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/logout-all": {
      "post": {
        "tags": ["Auth"],
        "summary": "Logout All Sessions",
        "description": "Revoke all sessions for the user.",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/me": {
      "get": {
        "tags": ["Auth"],
        "summary": "Get Current User",
        "description": "Get profile of currently logged in user.",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/refresh": {
      "post": {
        "tags": ["Auth"],
        "summary": "Refresh Token",
        "description": "Get new access token using refresh token.",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "schema": {
              "type": "object",
              "properties": {
                "refreshToken": { "type": "string" }
              },
              "required": ["refreshToken"]
            }
          }
        ],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/change-password": {
      "post": {
        "tags": ["Auth"],
        "summary": "Change Password",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "schema": {
              "type": "object",
              "properties": {
                "oldPassword": { "type": "string" },
                "newPassword": { "type": "string" },
                "confirmPassword": { "type": "string" }
              }
            }
          }
        ],
        "responses": {
          "200": { "description": "OK" }
        }
      }
    },
    "/api/auth/forgot-password": {
        "post": {
          "tags": ["Auth"],
          "summary": "Forgot Password",
          "parameters": [
            {
              "name": "body",
              "in": "body",
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string" }
                }
              }
            }
          ],
          "responses": {
            "200": { "description": "OK" }
          }
        }
      },
      "/api/auth/reset-password": {
        "post": {
          "tags": ["Auth"],
          "summary": "Reset Password",
          "parameters": [
            {
              "name": "body",
              "in": "body",
              "schema": {
                "type": "object",
                "properties": {
                  "token": { "type": "string" },
                  "newPassword": { "type": "string" },
                  "confirmPassword": { "type": "string" }
                }
              }
            }
          ],
          "responses": {
            "200": { "description": "OK" }
          }
        }
      },
    "/api/auth/sessions": {
        "get": {
          "tags": ["Auth"],
          "summary": "List Sessions",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "OK" }
          }
        }
      },
    "/api/auth/sessions/{sessionId}": {
        "delete": {
          "tags": ["Auth"],
          "summary": "Revoke Session",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            {
              "name": "sessionId",
              "in": "path",
              "required": true,
              "type": "string"
            }
          ],
          "responses": {
            "200": { "description": "OK" }
          }
        }
      }
  },
  "definitions": {
    "AppError": {
      "status": 'error',
      "message": 'Error message'
    }
  }
};

const fs = require('fs');
const path = require('path');
const outputFile = path.join(__dirname, 'swagger_output.json');
// Clean up endpoints files as they are no longer needed for manual spec
const endpointsFiles = [];

console.log('Generating Swagger Documentation from Config...');

// Directly write the manual spec to file to prevent autogen from overwriting it with empty paths
try {
  fs.writeFileSync(outputFile, JSON.stringify(doc, null, 2));
  console.log('Swagger documentation generated successfully! (Manual Mode)');
  process.exit(0);
} catch (err) {
  console.error('Swagger generation failed:', err);
  process.exit(1);
}
