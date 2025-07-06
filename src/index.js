const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Esquemas de Mongoose definidos aquí por ahora
const fondoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  montoMinimo: { type: Number, required: true },
  categoria: { type: String, enum: ['FPV', 'FIC'], required: true },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  telefono: { type: String },
  saldo: { type: Number, default: 500000 },
  preferenciaNotificacion: { type: String, enum: ['email', 'sms'], default: 'email' },
  fondosActivos: [{
    fondo: { type: mongoose.Schema.Types.ObjectId, ref: 'Fondo' },
    montoInvertido: { type: Number, required: true },
    fechaSuscripcion: { type: Date, default: Date.now }
  }],
  activo: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password antes de guardar
clienteSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
clienteSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const transaccionSchema = new mongoose.Schema({
  transaccionId: { type: String, required: true, unique: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  fondo: { type: mongoose.Schema.Types.ObjectId, ref: 'Fondo', required: true },
  tipo: { type: String, enum: ['suscripcion', 'cancelacion'], required: true },
  valor: { type: Number, required: true },
  estado: { type: String, enum: ['completada', 'fallida'], default: 'completada' }
}, { timestamps: true });

// Modelos
const Fondo = mongoose.model('Fondo', fondoSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Transaccion = mongoose.model('Transaccion', transaccionSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    req.user = user; // Información del usuario autenticado
    next();
  });
};

// Middleware para verificar roles
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Función para generar token
const generateToken = (cliente) => {
  return jwt.sign(
    { 
      id: cliente._id,
      email: cliente.email,
      nombre: cliente.nombre,
      role: cliente.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

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

// === RUTAS DE AUTENTICACIÓN ===

// POST /api/auth/register - Registrar y autenticar
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, email, telefono, preferenciaNotificacion, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    // Verificar si ya existe
    const clienteExistente = await Cliente.findOne({ email: email.toLowerCase() });
    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email'
      });
    }

    // Crear cliente (el schema ya hashea la password)
    const nuevoCliente = new Cliente({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password, // Se hasheará automáticamente
      telefono: telefono?.trim(),
      preferenciaNotificacion: preferenciaNotificacion || 'email'
    });

    await nuevoCliente.save();

    // Generar token
    const token = generateToken(nuevoCliente);

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        cliente: {
          id: nuevoCliente._id,
          nombre: nuevoCliente.nombre,
          email: nuevoCliente.email,
          saldo: nuevoCliente.saldo,
          preferenciaNotificacion: nuevoCliente.preferenciaNotificacion
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar cliente',
      error: error.message
    });
  }
});

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar cliente
    const cliente = await Cliente.findOne({ email: email.toLowerCase() });
    if (!cliente) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await cliente.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = generateToken(cliente);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        cliente: {
          id: cliente._id,
          nombre: cliente.nombre,
          email: cliente.email,
          saldo: cliente.saldo,
          preferenciaNotificacion: cliente.preferenciaNotificacion
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en login',
      error: error.message
    });
  }
});

// === RUTAS ADMINISTRATIVAS (Solo Admin) ===

// GET /api/admin/clientes - Ver todos los clientes (Solo Admin)
app.get('/api/admin/clientes', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const clientes = await Cliente.find({})
      .select('-password')
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Lista de todos los clientes',
      data: clientes,
      count: clientes.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});

// GET /api/admin/estadisticas - Estadísticas generales (Solo Admin)
app.get('/api/admin/estadisticas', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalClientes = await Cliente.countDocuments();
    const totalTransacciones = await Transaccion.countDocuments();
    const totalSuscripciones = await Transaccion.countDocuments({ tipo: 'suscripcion' });
    const totalCancelaciones = await Transaccion.countDocuments({ tipo: 'cancelacion' });
    
    const valorTotalTransacciones = await Transaccion.aggregate([
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);

    res.json({
      success: true,
      data: {
        clientes: totalClientes,
        transacciones: {
          total: totalTransacciones,
          suscripciones: totalSuscripciones,
          cancelaciones: totalCancelaciones
        },
        valorTotal: valorTotalTransacciones[0]?.total || 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// GET /api/auth/me - Obtener información del usuario autenticado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.user.id)
      .select('-password')
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario',
      error: error.message
    });
  }
});

// POST /api/admin/create-admin - Crear usuario administrador
app.post('/api/admin/create-admin', async (req, res) => {
  try {
    const { nombre, email, password, secretKey } = req.body;

    // Verificar clave secreta (en producción usar variable de entorno)
    if (secretKey !== 'BTG_ADMIN_SECRET_2025') {
      return res.status(403).json({
        success: false,
        message: 'Clave secreta inválida'
      });
    }

    const adminExistente = await Cliente.findOne({ email: email.toLowerCase() });
    if (adminExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      });
    }

    const nuevoAdmin = new Cliente({
      nombre,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      saldo: 0 // Los admins no manejan fondos
    });

    await nuevoAdmin.save();

    const token = generateToken(nuevoAdmin);

    res.status(201).json({
      success: true,
      message: 'Administrador creado exitosamente',
      data: {
        admin: {
          id: nuevoAdmin._id,
          nombre: nuevoAdmin.nombre,
          email: nuevoAdmin.email,
          role: nuevoAdmin.role
        },
        token
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear administrador',
      error: error.message
    });
  }
});

// === RUTAS DE FONDOS ===

// GET /api/fondos - Obtener todos los fondos
app.get('/api/fondos', async (req, res) => {
  try {
    console.log('🔍 Buscando fondos activos...');
    const fondos = await Fondo.find({}).sort({ nombre: 1 });
    console.log(`📊 Encontrados ${fondos.length} fondos activos`);
    
    res.json({
      success: true,
      message: 'Fondos obtenidos exitosamente',
      data: fondos,
      count: fondos.length
    });
  } catch (error) {
    console.error('❌ Error en consulta fondos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondos',
      error: error.message
    });
  }
});

// GET /api/fondos/all - Ver TODOS los fondos (sin filtro activo) - DEBE IR ANTES DE :id
app.get('/api/fondos/all', async (req, res) => {
  try {
    console.log('🔍 Buscando TODOS los fondos...');
    const fondos = await Fondo.find({}).sort({ nombre: 1 });
    console.log(`📊 Encontrados ${fondos.length} fondos totales`);
    
    res.json({
      success: true,
      message: 'Todos los fondos (sin filtros)',
      data: fondos,
      count: fondos.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener todos los fondos',
      error: error.message
    });
  }
});

// GET /api/fondos/:id - Obtener fondo específico (DEBE IR AL FINAL)
app.get('/api/fondos/:id', async (req, res) => {
  try {
    const fondo = await Fondo.findById(req.params.id);
    if (!fondo) {
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }
    res.json({ success: true, data: fondo });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondo',
      error: error.message
    });
  }
});

// === RUTAS DE CLIENTES ===

// POST /api/clientes - Crear cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, email, telefono, preferenciaNotificacion } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y email son requeridos'
      });
    }

    const clienteExistente = await Cliente.findOne({ email: email.toLowerCase() });
    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email'
      });
    }

    const nuevoCliente = new Cliente({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono?.trim(),
      preferenciaNotificacion: preferenciaNotificacion || 'email'
    });

    await nuevoCliente.save();

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: nuevoCliente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente',
      error: error.message
    });
  }
});

// GET /api/clientes - Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find({ activo: true })
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo')
      .sort({ nombre: 1 });
    
    res.json({
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: clientes,
      count: clientes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});

// GET /api/clientes/:id - Obtener cliente específico
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente',
      error: error.message
    });
  }
});

// === RUTAS DE TRANSACCIONES ===
//////////////////////////////////////////////////////////////////////////////////////////
// // POST /api/fondos/:fondoId/suscribir - Suscribirse a un fondo
// app.post('/api/fondos/:fondoId/suscribir', authenticateToken, async (req, res) => {
//   try {
//     const clienteId = req.user.id; // ID del token JWT
//     const { fondoId } = req.params;

//     // Log de seguridad
//     console.log(`[SUSCRIPCIÓN] Usuario: ${req.user.nombre} (${req.user.email}) intentando suscribirse al fondo ${fondoId}`);

//     // Validar formato de ObjectId
//     if (!mongoose.Types.ObjectId.isValid(fondoId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'ID de fondo inválido'
//       });
//     }

//     // Buscar fondo y cliente
//     const [fondo, cliente] = await Promise.all([
//       Fondo.findById(fondoId),
//       Cliente.findById(clienteId)
//     ]);

//     if (!fondo) {
//       console.log(`[SUSCRIPCIÓN] Fondo ${fondoId} no encontrado`);
//       return res.status(404).json({
//         success: false,
//         message: 'Fondo no encontrado'
//       });
//     }

//     if (!cliente) {
//       console.log(`[SUSCRIPCIÓN] Cliente ${clienteId} no encontrado en BD`);
//       return res.status(404).json({
//         success: false,
//         message: 'Cliente no encontrado'
//       });
//     }

//     // Verificar que el cliente esté activo
//     if (!cliente.activo) {
//       return res.status(403).json({
//         success: false,
//         message: 'Cuenta de cliente desactivada'
//       });
//     }

//     // Verificar si ya está suscrito
//     const yaSuscrito = cliente.fondosActivos.some(
//       fa => fa.fondo && fa.fondo.toString() === fondoId
//     );

//     if (yaSuscrito) {
//       console.log(`[SUSCRIPCIÓN] Cliente ${cliente.nombre} ya suscrito al fondo ${fondo.nombre}`);
//       return res.status(400).json({
//         success: false,
//         message: 'Ya está suscrito a este fondo'
//       });
//     }

//     // Verificar saldo suficiente
//     if (cliente.saldo < fondo.montoMinimo) {
//       console.log(`[SUSCRIPCIÓN] Saldo insuficiente. Cliente: $${cliente.saldo}, Requerido: $${fondo.montoMinimo}`);
//       return res.status(400).json({
//         success: false,
//         message: `No tiene saldo disponible para vincularse al fondo ${fondo.nombre}`,
//         data: {
//           saldoActual: cliente.saldo,
//           montoRequerido: fondo.montoMinimo,
//           faltante: fondo.montoMinimo - cliente.saldo
//         }
//       });
//     }

//     // Crear transacción
//     const { v4: uuidv4 } = require('uuid');
//     const transaccion = new Transaccion({
//       transaccionId: uuidv4(),
//       cliente: clienteId,
//       fondo: fondoId,
//       tipo: 'suscripcion',
//       valor: fondo.montoMinimo
//     });

//     // Actualizar cliente
//     const saldoAnterior = cliente.saldo;
//     cliente.saldo -= fondo.montoMinimo;
//     cliente.fondosActivos.push({
//       fondo: fondoId,
//       montoInvertido: fondo.montoMinimo,
//       fechaSuscripcion: new Date()
//     });

//     // Guardar cambios en transacción de BD
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       await cliente.save({ session });
//       await transaccion.save({ session });
//       await session.commitTransaction();
      
//       console.log(`[SUSCRIPCIÓN] Exitosa - ${cliente.nombre} → ${fondo.nombre} ($${fondo.montoMinimo})`);
      
//     } catch (sessionError) {
//       await session.abortTransaction();
//       throw sessionError;
//     } finally {
//       session.endSession();
//     }

//     res.status(201).json({
//       success: true,
//       message: `Suscripción exitosa al fondo ${fondo.nombre}`,
//       data: {
//         transaccion: {
//           id: transaccion.transaccionId,
//           tipo: transaccion.tipo,
//           valor: transaccion.valor,
//           fecha: transaccion.createdAt
//         },
//         cliente: {
//           nombre: cliente.nombre,
//           saldoAnterior: saldoAnterior,
//           saldoActual: cliente.saldo,
//           totalFondos: cliente.fondosActivos.length
//         },
//         fondo: {
//           nombre: fondo.nombre,
//           categoria: fondo.categoria,
//           montoInvertido: fondo.montoMinimo
//         }
//       }
//     });

//   } catch (error) {
//     console.error(`[SUSCRIPCIÓN] Error para usuario ${req.user?.email}:`, error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Error al procesar suscripción',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
//     });
//   }
// });
////////////////////////////////////////////////////////////



// POST /api/fondos/:fondoId/suscribir - Suscribirse a un fondo
app.post('/api/fondos/:fondoId/suscribir', authenticateToken, async (req, res) => {
  console.log('🚀 [SUSCRIPCIÓN] Iniciando proceso...');
  
  try {
    const clienteId = req.user.id; // ID del token JWT
    const { fondoId } = req.params;

    console.log(`📋 [SUSCRIPCIÓN] Datos recibidos:`, {
      clienteId,
      fondoId,
      userFromToken: req.user
    });

    // Validar formato de ObjectId
    if (!mongoose.Types.ObjectId.isValid(fondoId)) {
      console.log('❌ [SUSCRIPCIÓN] ID de fondo inválido:', fondoId);
      return res.status(400).json({
        success: false,
        message: 'ID de fondo inválido'
      });
    }

    console.log('✅ [SUSCRIPCIÓN] ObjectId válido, buscando en BD...');

    // Buscar fondo y cliente
    const [fondo, cliente] = await Promise.all([
      Fondo.findById(fondoId),
      Cliente.findById(clienteId)
    ]);

    console.log('🔍 [SUSCRIPCIÓN] Resultados de búsqueda:', {
      fondoEncontrado: !!fondo,
      clienteEncontrado: !!cliente,
      fondoNombre: fondo?.nombre,
      clienteNombre: cliente?.nombre,
      clienteSaldo: cliente?.saldo
    });

    if (!fondo) {
      console.log(`❌ [SUSCRIPCIÓN] Fondo ${fondoId} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }

    if (!cliente) {
      console.log(`❌ [SUSCRIPCIÓN] Cliente ${clienteId} no encontrado en BD`);
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar que el cliente esté activo
    if (!cliente.activo) {
      console.log('❌ [SUSCRIPCIÓN] Cliente desactivado');
      return res.status(403).json({
        success: false,
        message: 'Cuenta de cliente desactivada'
      });
    }

    console.log('🔍 [SUSCRIPCIÓN] Verificando suscripción previa...');

    // Verificar si ya está suscrito
    const yaSuscrito = cliente.fondosActivos.some(
      fa => fa.fondo && fa.fondo.toString() === fondoId
    );

    console.log('📊 [SUSCRIPCIÓN] Estado suscripción:', {
      yaSuscrito,
      fondosActivosCount: cliente.fondosActivos.length,
      fondosActivos: cliente.fondosActivos.map(fa => fa.fondo?.toString())
    });

    if (yaSuscrito) {
      console.log(`❌ [SUSCRIPCIÓN] Cliente ${cliente.nombre} ya suscrito al fondo ${fondo.nombre}`);
      return res.status(400).json({
        success: false,
        message: 'Ya está suscrito a este fondo'
      });
    }

    console.log('💰 [SUSCRIPCIÓN] Verificando saldo...');

    // Verificar saldo suficiente
    if (cliente.saldo < fondo.montoMinimo) {
      console.log(`❌ [SUSCRIPCIÓN] Saldo insuficiente. Cliente: $${cliente.saldo}, Requerido: $${fondo.montoMinimo}`);
      return res.status(400).json({
        success: false,
        message: `No tiene saldo disponible para vincularse al fondo ${fondo.nombre}`,
        data: {
          saldoActual: cliente.saldo,
          montoRequerido: fondo.montoMinimo,
          faltante: fondo.montoMinimo - cliente.saldo
        }
      });
    }

    console.log('📄 [SUSCRIPCIÓN] Creando transacción...');

    // Crear transacción
    const { v4: uuidv4 } = require('uuid');
    const transaccion = new Transaccion({
      transaccionId: uuidv4(),
      cliente: clienteId,
      fondo: fondoId,
      tipo: 'suscripcion',
      valor: fondo.montoMinimo
    });

    console.log('🔄 [SUSCRIPCIÓN] Actualizando cliente...');

    // Actualizar cliente
    const saldoAnterior = cliente.saldo;
    cliente.saldo -= fondo.montoMinimo;
    cliente.fondosActivos.push({
      fondo: fondoId,
      montoInvertido: fondo.montoMinimo,
      fechaSuscripcion: new Date()
    });
////////////////////////////////////////////
    // console.log('💾 [SUSCRIPCIÓN] Guardando cambios en BD...');

    // // Guardar cambios en transacción de BD
    // const session = await mongoose.startSession();
    // session.startTransaction();

    // try {
    //   await cliente.save({ session });
    //   await transaccion.save({ session });
    //   await session.commitTransaction();
      
    //   console.log(`✅ [SUSCRIPCIÓN] Exitosa - ${cliente.nombre} → ${fondo.nombre} ($${fondo.montoMinimo})`);
      
    // } catch (sessionError) {
    //   console.error('❌ [SUSCRIPCIÓN] Error en transacción BD:', sessionError);
    //   await session.abortTransaction();
    //   throw sessionError;
    // } finally {
    //   session.endSession();
    // }

    // console.log('🎉 [SUSCRIPCIÓN] Enviando respuesta exitosa...');

    // res.status(201).json({
    //   success: true,
    //   message: `Suscripción exitosa al fondo ${fondo.nombre}`,
    //   data: {
    //     transaccion: {
    //       id: transaccion.transaccionId,
    //       tipo: transaccion.tipo,
    //       valor: transaccion.valor,
    //       fecha: transaccion.createdAt
    //     },
    //     cliente: {
    //       nombre: cliente.nombre,
    //       saldoAnterior: saldoAnterior,
    //       saldoActual: cliente.saldo,
    //       totalFondos: cliente.fondosActivos.length
    //     },
    //     fondo: {
    //       nombre: fondo.nombre,
    //       categoria: fondo.categoria,
    //       montoInvertido: fondo.montoMinimo
    //     }
    //   }
    // });
/////////////////////////////////////////////
// REEMPLAZA esta sección en tu src/index.js (alrededor de línea 730):

// En lugar de usar transacciones, usar saves secuenciales
// Esto funciona tanto en producción como en tests

console.log('💾 [SUSCRIPCIÓN] Guardando cambios en BD...');

try {
  // Guardar cliente y transacción secuencialmente
  await cliente.save();
  await transaccion.save();
  
  console.log(`✅ [SUSCRIPCIÓN] Exitosa - ${cliente.nombre} → ${fondo.nombre} ($${fondo.montoMinimo})`);
  
} catch (saveError) {
  console.error('❌ [SUSCRIPCIÓN] Error guardando:', saveError);
  cliente.saldo = saldoAnterior;
  cliente.fondosActivos.pop();
  throw saveError;
}

console.log('🎉 [SUSCRIPCIÓN] Enviando respuesta exitosa...');

res.status(201).json({
  success: true,
  message: `Suscripción exitosa al fondo ${fondo.nombre}`,
  data: {
    transaccion: {
      id: transaccion.transaccionId,
      tipo: transaccion.tipo,
      valor: transaccion.valor,
      fecha: transaccion.createdAt
    },
    cliente: {
      nombre: cliente.nombre,
      saldoAnterior: saldoAnterior,
      saldoActual: cliente.saldo,
      totalFondos: cliente.fondosActivos.length
    },
    fondo: {
      nombre: fondo.nombre,
      categoria: fondo.categoria,
      montoInvertido: fondo.montoMinimo
    }
  }
});
  } catch (error) {
    console.error(`🚨 [SUSCRIPCIÓN] ERROR CRÍTICO:`, {
      mensaje: error.message,
      stack: error.stack,
      usuario: req.user?.email,
      fondoId: req.params.fondoId
    });
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar suscripción',
      error: 'Error interno del servidor',
      // Agregar info de debug en modo test
      debug: process.env.NODE_ENV === 'test' ? {
        originalError: error.message,
        stack: error.stack
      } : undefined
    });
  }
});


// DELETE /api/fondos/:fondoId/cancelar - Cancelar suscripción
app.delete('/api/fondos/:fondoId/cancelar', authenticateToken, async (req, res) => {
  try {
    const clienteId = req.user.id; // ID del token JWT
    const { fondoId } = req.params;

    // Log de seguridad
    console.log(`[CANCELACIÓN] Usuario: ${req.user.nombre} (${req.user.email}) cancelando fondo ${fondoId}`);

    // Validar formato de ObjectId
    if (!mongoose.Types.ObjectId.isValid(fondoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de fondo inválido'
      });
    }

    // Buscar fondo y cliente
    const [fondo, cliente] = await Promise.all([
      Fondo.findById(fondoId),
      Cliente.findById(clienteId)
    ]);

    if (!fondo) {
      console.log(`[CANCELACIÓN] Fondo ${fondoId} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }

    if (!cliente) {
      console.log(`[CANCELACIÓN] Cliente ${clienteId} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Buscar suscripción
    const suscripcionIndex = cliente.fondosActivos.findIndex(
      fa => fa.fondo && fa.fondo.toString() === fondoId
    );

    if (suscripcionIndex === -1) {
      console.log(`[CANCELACIÓN] Cliente ${cliente.nombre} no está suscrito al fondo ${fondo.nombre}`);
      return res.status(400).json({
        success: false,
        message: 'No está suscrito a este fondo'
      });
    }

    const suscripcion = cliente.fondosActivos[suscripcionIndex];

    // Crear transacción de cancelación
    const { v4: uuidv4 } = require('uuid');
    const transaccion = new Transaccion({
      transaccionId: uuidv4(),
      cliente: clienteId,
      fondo: fondoId,
      tipo: 'cancelacion',
      valor: suscripcion.montoInvertido
    });

    // Actualizar cliente
    const saldoAnterior = cliente.saldo;
    cliente.saldo += suscripcion.montoInvertido;
    cliente.fondosActivos.splice(suscripcionIndex, 1);

    // Guardar cambios en transacción de BD
    console.log('💾 [CANCELACIÓN] Guardando cambios en BD...');


    try {
    await cliente.save();
    await transaccion.save();
    
    console.log(`✅ [CANCELACIÓN] Exitosa - ${cliente.nombre} canceló ${fondo.nombre} (+$${suscripcion.montoInvertido})`);
      
    } catch (saveError) {
      console.error('❌ [CANCELACIÓN] Error guardando:', saveError);
      cliente.saldo = saldoAnterior;
      cliente.fondosActivos.splice(suscripcionIndex, 0, suscripcion); // Restaurar la suscripción
      throw saveError;
    }

    res.json({
      success: true,
      message: `Cancelación exitosa del fondo ${fondo.nombre}`,
      data: {
        transaccion: {
          id: transaccion.transaccionId,
          tipo: transaccion.tipo,
          valor: transaccion.valor,
          fecha: transaccion.createdAt
        },
        cliente: {
          nombre: cliente.nombre,
          saldoAnterior: saldoAnterior,
          saldoActual: cliente.saldo,
          totalFondos: cliente.fondosActivos.length
        },
        fondo: {
          nombre: fondo.nombre,
          categoria: fondo.categoria,
          montoDevuelto: suscripcion.montoInvertido,
          fechaSuscripcionOriginal: suscripcion.fechaSuscripcion
        }
      }
    });

  } catch (error) {
    console.error(`[CANCELACIÓN] Error para usuario ${req.user?.email}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Error al procesar cancelación',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
});

// GET /api/transacciones - Obtener todas las transacciones
app.get('/api/transacciones', async (req, res) => {
  try {
    const { clienteId, tipo, limite = 10 } = req.query;
    let filtros = {};
    
    if (clienteId) filtros.cliente = clienteId;
    if (tipo) filtros.tipo = tipo;

    const transacciones = await Transaccion.find(filtros)
      .populate('cliente', 'nombre email')
      .populate('fondo', 'nombre categoria')
      .sort({ createdAt: -1 })
      .limit(parseInt(limite));

    res.json({
      success: true,
      message: 'Transacciones obtenidas exitosamente',
      data: transacciones,
      count: transacciones.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: error.message
    });
  }
});

// GET /api/transacciones/cliente/:clienteId - Historial del cliente
app.get('/api/transacciones/cliente/:clienteId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.clienteId).select('nombre');
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const transacciones = await Transaccion.find({ cliente: req.params.clienteId })
      .populate('fondo', 'nombre categoria')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: `Historial de transacciones para ${cliente.nombre}`,
      data: {
        cliente: cliente.nombre,
        transacciones: transacciones
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
});

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

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
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
      console.log('❌ El servidor no arrancó por fallo de conexión a MongoDB.');
    });
}

