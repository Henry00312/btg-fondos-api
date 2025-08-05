const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Configuración de variables de entorno
dotenv.config();

// Importar modelos
const Fondo = require('./models/Fondo');
const Cliente = require('./models/Cliente');
const Transaccion = require('./models/Transaccion');

// Importar rutas
const authRoutes = require('./routes/auth');
const fondosRoutes = require('./routes/fondos');
const clientesRoutes = require('./routes/clientes');
const transaccionesRoutes = require('./routes/transacciones');

// Documentación Swagger
const app = express();
const PORT = process.env.PORT || 3001;

const { swaggerUi, specs } = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    await initializeFunds();
    
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error.message);
    throw error;
  }
};

// Inicializar fondos
const initializeFunds = async () => {
  try {
    const existingFunds = await Fondo.countDocuments();
    if (existingFunds > 0) {
      console.log('✅ Fondos ya inicializados');
      return;
    }

    const fondos = [
      { nombre: 'FPV_BTG_PACTUAL_RECAUDADORA', montoMinimo: 75000, categoria: 'FPV' },
      { nombre: 'FPV_BTG_PACTUAL_ECOPETROL', montoMinimo: 125000, categoria: 'FPV' },
      { nombre: 'DEUDAPRIVADA', montoMinimo: 50000, categoria: 'FIC' },
      { nombre: 'FDO-ACCIONES', montoMinimo: 250000, categoria: 'FIC' },
      { nombre: 'FPV_BTG_PACTUAL_DINAMICA', montoMinimo: 100000, categoria: 'FPV' }
    ];

    await Fondo.insertMany(fondos);
    console.log('✅ Fondos inicializados correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando fondos:', error.message);
  }
};

// RUTAS

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API de Fondos BTG Pactual',
    version: '1.0.0',
    status: 'operativa',
    endpoints: {
      fondos: '/api/fondos',
      clientes: '/api/clientes',
      transacciones: '/api/transacciones'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rutas separadas
app.use('/api/auth', authRoutes);
app.use('/api/fondos', fondosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/transacciones', transaccionesRoutes);

// === RUTAS DE DEBUG ===

// POST /api/admin/init-fondos - Forzar inicialización de fondos
app.post('/api/admin/init-fondos', async (req, res) => {
  try {
    console.log('🔄 Forzando inicialización de fondos...');
    
    // Borrar fondos existentes (opcional)
    await Fondo.deleteMany({});
    console.log('🗑️ Fondos existentes eliminados');

    const fondos = [
      { nombre: 'FPV_BTG_PACTUAL_RECAUDADORA', montoMinimo: 75000, categoria: 'FPV' },
      { nombre: 'FPV_BTG_PACTUAL_ECOPETROL', montoMinimo: 125000, categoria: 'FPV' },
      { nombre: 'DEUDAPRIVADA', montoMinimo: 50000, categoria: 'FIC' },
      { nombre: 'FDO-ACCIONES', montoMinimo: 250000, categoria: 'FIC' },
      { nombre: 'FPV_BTG_PACTUAL_DINAMICA', montoMinimo: 100000, categoria: 'FPV' }
    ];

    const fondosCreados = await Fondo.insertMany(fondos);
    console.log(`${fondosCreados.length} fondos creados exitosamente`);

    res.json({
      success: true,
      message: `${fondosCreados.length} fondos inicializados correctamente`,
      data: fondosCreados
    });

  } catch (error) {
    console.error('Error forzando inicialización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al inicializar fondos',
      error: error.message
    });
  }
});


// GET /api/admin/debug - Información de debug
app.get('/api/admin/debug', async (req, res) => {
  try {
    const totalFondos = await Fondo.countDocuments();
    const fondos = await Fondo.find({});
    const totalClientes = await Cliente.countDocuments();
    const totalTransacciones = await Transaccion.countDocuments();

    res.json({
      success: true,
      debug: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: {
          fondos: {
            count: totalFondos,
            data: fondos
          },
          clientes: totalClientes,
          transacciones: totalTransacciones
        },
        connectionInfo: {
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en debug',
      error: error.message
    });
  }
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});


// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('❗ Rechazo no manejado:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❗ Excepción no capturada:', error);
});

module.exports = app;

// Conectar a la base de datos e iniciar servidor
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 Endpoints disponibles:`);
        console.log(`   GET  http://localhost:${PORT}/`);
        console.log(`   GET  http://localhost:${PORT}/api/fondos`);
        console.log(`   POST http://localhost:${PORT}/api/clientes`);
        console.log(`   POST http://localhost:${PORT}/api/fondos/:id/suscribir`);
        console.log(`   GET  http://localhost:${PORT}/api/transacciones`);
      });
    })
    .catch((error) => {
      console.error('🚨 Error al conectar base de datos:', error.message);
      process.exit(1); // <--- ESTO es lo que App Runner necesita ver
    });
}