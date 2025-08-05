const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Cliente = require('../models/Cliente');
const Transaccion = require('../models/Transaccion');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

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

// POST /api/auth/register - Registrar y autenticar
router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

// GET /api/auth/me - Obtener información del usuario autenticado
router.get('/me', authenticateToken, async (req, res) => {
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

// POST /api/auth/refresh - Renovar token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const nuevoToken = generateToken({ _id: req.user.id, email: req.user.email, nombre: req.user.nombre, role: req.user.role });

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        token: nuevoToken
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al renovar token',
      error: error.message
    });
  }
});

// POST /api/auth/create-admin - Crear usuario administrador
router.post('/create-admin', async (req, res) => {
  try {
    const { nombre, email, password, secretKey } = req.body;

    const adminSecret = process.env.ADMIN_SECRET_KEY || 'BTG_ADMIN_SECRET_2025';
    if (secretKey !== adminSecret) {
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


// === RUTAS ADMINISTRATIVAS (Solo Admin) ===

// GET /api/auth/admin/clientes - Ver todos los clientes (Solo Admin)
router.get('/admin/clientes', authenticateToken, authorizeRole('admin'), async (req, res) => {
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

// GET /api/auth/admin/estadisticas - Estadísticas generales (Solo Admin)
router.get('/admin/estadisticas', authenticateToken, authorizeRole('admin'), async (req, res) => {
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

module.exports = router;
