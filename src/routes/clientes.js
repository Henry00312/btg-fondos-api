const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const Transaccion = require('../models/Transaccion');

// GET /api/clientes - Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find({ activo: true })
      .select('-password')
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

// POST /api/clientes - Crear nuevo cliente
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, telefono, preferenciaNotificacion } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    // Verificar si ya existe el email
    const clienteExistente = await Cliente.findOne({ email: email.toLowerCase() });
    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email'
      });
    }

    // Crear nuevo cliente
    const nuevoCliente = new Cliente({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password,
      telefono: telefono?.trim(),
      preferenciaNotificacion: preferenciaNotificacion || 'email'
    });

    await nuevoCliente.save();

    // Respuesta sin password
    const clienteRespuesta = nuevoCliente.toJSON();
    delete clienteRespuesta.password;

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: clienteRespuesta
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errores
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear cliente',
      error: error.message
    });
  }
});

// GET /api/clientes/:id - Obtener cliente específico
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
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
      message: 'Error al obtener cliente',
      error: error.message
    });
  }
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { nombre, telefono, preferenciaNotificacion } = req.body;
    
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Actualizar campos permitidos
    if (nombre) cliente.nombre = nombre.trim();
    if (telefono) cliente.telefono = telefono.trim();
    if (preferenciaNotificacion) cliente.preferenciaNotificacion = preferenciaNotificacion;

    await cliente.save();

    const clienteActualizado = await Cliente.findById(req.params.id)
      .select('-password')
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo');

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: clienteActualizado
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cliente',
      error: error.message
    });
  }
});

// GET /api/clientes/:id/saldo - Obtener saldo del cliente
router.get('/:id/saldo', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id).select('nombre saldo');
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        cliente: cliente.nombre,
        saldo: cliente.saldo,
        saldoFormateado: `$${cliente.saldo.toLocaleString('es-CO')} COP`
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener saldo',
      error: error.message
    });
  }
});

// GET /api/clientes/:id/fondos - Obtener fondos activos del cliente
router.get('/:id/fondos', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
      .select('nombre saldo fondosActivos')
      .populate('fondosActivos.fondo', 'nombre categoria montoMinimo');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const totalInvertido = cliente.fondosActivos.reduce(
      (total, fa) => total + fa.montoInvertido, 0
    );

    res.json({
      success: true,
      data: {
        cliente: cliente.nombre,
        saldoDisponible: cliente.saldo,
        totalInvertido: totalInvertido,
        fondosActivos: cliente.fondosActivos,
        resumen: {
          totalFondos: cliente.fondosActivos.length,
          patrimonio: cliente.saldo + totalInvertido
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondos del cliente',
      error: error.message
    });
  }
});

module.exports = router;