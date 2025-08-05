const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Configurar base de datos de prueba antes de todos los tests
beforeAll(async () => {
  try {
    // Usar MongoDB en memoria para tests
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    
    // Conectar mongoose a la BD de prueba
    await mongoose.connect(mongoUri);
    
    console.log('✅ Base de datos de prueba conectada');
  } catch (error) {
    console.error('❌ Error configurando BD de prueba:', error);
  }
});

// Limpiar datos entre tests
beforeEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    console.log('🧹 Base de datos limpiada');
  } catch (error) {
    console.error('❌ Error limpiando BD:', error);
  }
});

// Cerrar conexión después de todos los tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    if (mongod) {
      await mongod.stop();
    }
    
    console.log('🔒 Base de datos de prueba cerrada');
  } catch (error) {
    console.error('❌ Error cerrando BD de prueba:', error);
  }
});

// Configuraciones globales para tests
jest.setTimeout(10000);
