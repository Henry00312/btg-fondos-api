const path = require('path');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BTG Pactual - API de Fondos de Inversión',
      version: '1.0.0',
      description: 'Documentación de la API del backend técnico.',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor local (dev)',
      },
    ],
  },
  apis: [path.join(__dirname, 'routes', '*.js')],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
