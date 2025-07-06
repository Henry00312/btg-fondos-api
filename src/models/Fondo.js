
const express = require('express');
const router = express.Router();
const Fondo = require('../models/Fondo');
const Cliente = require('../models/Cliente');
const Transaccion = require('../models/Transaccion');

// GET /api/fondos - Obtener todos los fondos disponibles
router.get('/', async (req, res) => {
  try {
    const fondos = await Fondo.find({}).sort({ nombre: 1 });
    
    res.json({
      success: true,
      message: 'Fondos obtenidos exitosamente',
      data: fondos,
      count: fondos.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondos',
      error: error.message
    });
  }
});

// GET /api/fondos/:id - Obtener fondo específico
router.get('/:id', async (req, res) => {
  try {
    const fondo = await Fondo.findById(req.params.id);
    
    if (!fondo) {
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: fondo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondo',
      error: error.message
    });
  }
});

// POST /api/fondos/:id/suscribir - Suscribirse a un fondo
router.post('/:id/suscribir', async (req, res) => {
  try {
    const { clienteId } = req.body;
    const fondoId = req.params.id;

    // Validar entrada
    if (!clienteId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido'
      });
    }

    // Buscar fondo y cliente
    const fondo = await Fondo.findById(fondoId);
    const cliente = await Cliente.findById(clienteId);

    if (!fondo) {
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si el cliente ya está suscrito
    const yaSuscrito = cliente.fondosActivos.some(
      fa => fa.fondo.toString() === fondoId
    );

    if (yaSuscrito) {
      return res.status(400).json({
        success: false,
        message: 'Ya está suscrito a este fondo'
      });
    }

    // Verificar saldo suficiente
    if (cliente.saldo < fondo.montoMinimo) {
      return res.status(400).json({
        success: false,
        message: `No tiene saldo disponible para vincularse al fondo ${fondo.nombre}`
      });
    }

    // Crear transacción
    const transaccion = new Transaccion({
      cliente: clienteId,
      fondo: fondoId,
      tipo: 'suscripcion',
      valor: fondo.montoMinimo
    });

    // Suscribir al cliente
    cliente.suscribirseAFondo(fondoId, fondo.montoMinimo);
    
    // Guardar cambios
    await Promise.all([
      cliente.save(),
      transaccion.save()
    ]);

    res.status(201).json({
      success: true,
      message: `Suscripción exitosa al fondo ${fondo.nombre}`,
      data: {
        transaccion: transaccion,
        saldoActual: cliente.saldo,
        fondoSuscrito: fondo.nombre
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar suscripción'
    });
  }
});

// DELETE /api/fondos/:id/cancelar - Cancelar suscripción a un fondo
router.delete('/:id/cancelar', async (req, res) => {
  try {
    const { clienteId } = req.body;
    const fondoId = req.params.id;

    // Validar entrada
    if (!clienteId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido'
      });
    }

    // Buscar fondo y cliente
    const fondo = await Fondo.findById(fondoId);
    const cliente = await Cliente.findById(clienteId);

    if (!fondo) {
      return res.status(404).json({
        success: false,
        message: 'Fondo no encontrado'
      });
    }

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si está suscrito
    const suscripcion = cliente.fondosActivos.find(
      fa => fa.fondo.toString() === fondoId
    );

    if (!suscripcion) {
      return res.status(400).json({
        success: false,
        message: 'No está suscrito a este fondo'
      });
    }

    // Crear transacción de cancelación
    const transaccion = new Transaccion({
      cliente: clienteId,
      fondo: fondoId,
      tipo: 'cancelacion',
      valor: suscripcion.montoInvertido
    });

    // Cancelar suscripción
    const montoDevuelto = cliente.cancelarSuscripcion(fondoId);
    
    // Guardar cambios
    await Promise.all([
      cliente.save(),
      transaccion.save()
    ]);

    res.json({
      success: true,
      message: `Cancelación exitosa del fondo ${fondo.nombre}`,
      data: {
        transaccion: transaccion,
        montoDevuelto: montoDevuelto,
        saldoActual: cliente.saldo
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar cancelación'
    });
  }
});

// GET /api/fondos/cliente/:clienteId - Obtener fondos del cliente
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.clienteId)
      .populate('fondosActivos.fondo');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Fondos del cliente obtenidos exitosamente',
      data: {
        cliente: cliente.nombre,
        saldo: cliente.saldo,
        fondosActivos: cliente.fondosActivos
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