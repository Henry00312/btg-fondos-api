const express = require('express');
const router = express.Router();
const Transaccion = require('../models/Transaccion');
const Cliente = require('../models/Cliente');

/**
 * @swagger
 * /transacciones:
 *   get:
 *     summary: Obtener todas las transacciones (con filtros y paginación)
 *     tags: [Transacciones]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *         description: Número de página (por defecto 1)
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *         description: Cantidad de registros por página (por defecto 10)
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de transacción (suscripcion o cancelacion)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: string
 *         description: ID del cliente
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del filtro
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del filtro
 *     responses:
 *       200:
 *         description: Lista de transacciones obtenida exitosamente
 */
// GET /api/transacciones - Obtener todas las transacciones (con paginación)
router.get('/', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      tipo, 
      estado, 
      clienteId,
      fechaInicio,
      fechaFin 
    } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    let filtros = {};

    // Aplicar filtros
    if (tipo) filtros.tipo = tipo;
    if (estado) filtros.estado = estado;
    if (clienteId) filtros.cliente = clienteId;
    
    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
    }

    // Ejecutar consulta con paginación
    const [transacciones, total] = await Promise.all([
      Transaccion.find(filtros)
        .populate('cliente', 'nombre email')
        .populate('fondo', 'nombre categoria montoMinimo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite)),
      Transaccion.countDocuments(filtros)
    ]);

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: 'Transacciones obtenidas exitosamente',
      data: transacciones,
      pagination: {
        paginaActual: parseInt(pagina),
        totalPaginas,
        totalRegistros: total,
        registrosPorPagina: parseInt(limite)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /transacciones/{id}:
 *   get:
 *     summary: Obtener una transacción por ID
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la transacción
 *     responses:
 *       200:
 *         description: Transacción encontrada
 *       404:
 *         description: Transacción no encontrada
 */
// GET /api/transacciones/:id - Obtener transacción específica
router.get('/:id', async (req, res) => {
  try {
    const transaccion = await Transaccion.findById(req.params.id)
      .populate('cliente', 'nombre email telefono preferenciaNotificacion')
      .populate('fondo', 'nombre categoria montoMinimo');

    if (!transaccion) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    res.json({
      success: true,
      data: transaccion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacción',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /transacciones/cliente/{clienteId}:
 *   get:
 *     summary: Obtener historial de transacciones de un cliente
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Historial de transacciones del cliente
 *       404:
 *         description: Cliente no encontrado
 */
// GET /api/transacciones/cliente/:clienteId - Historial de cliente específico
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      tipo, 
      estado,
      fechaInicio,
      fechaFin 
    } = req.query;

    // Verificar que el cliente existe
    const cliente = await Cliente.findById(req.params.clienteId).select('nombre');
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener historial usando el método estático del modelo
    const transacciones = await Transaccion.obtenerHistorialCliente(
      req.params.clienteId,
      {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        tipo,
        estado,
        fechaInicio,
        fechaFin
      }
    );

    // Contar total para paginación
    let filtros = { cliente: req.params.clienteId };
    if (tipo) filtros.tipo = tipo;
    if (estado) filtros.estado = estado;
    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
    }

    const total = await Transaccion.countDocuments(filtros);
    const totalPaginas = Math.ceil(total / parseInt(limite));

    // Calcular estadísticas
    const estadisticas = await Transaccion.aggregate([
      { $match: { cliente: req.params.clienteId } },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          totalValor: { $sum: '$valor' }
        }
      }
    ]);

    res.json({
      success: true,
      message: `Historial de transacciones para ${cliente.nombre}`,
      data: {
        cliente: cliente.nombre,
        transacciones,
        estadisticas: estadisticas.reduce((acc, stat) => {
          acc[stat._id] = {
            cantidad: stat.count,
            valor: stat.totalValor
          };
          return acc;
        }, {}),
        pagination: {
          paginaActual: parseInt(pagina),
          totalPaginas,
          totalRegistros: total,
          registrosPorPagina: parseInt(limite)
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial del cliente',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /transacciones/buscar/{transaccionId}:
 *   get:
 *     summary: Buscar transacción por ID externo
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: transaccionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de transacción (UUID)
 *     responses:
 *       200:
 *         description: Transacción encontrada
 *       404:
 *         description: Transacción no encontrada
 */
// GET /api/transacciones/buscar/:transaccionId - Buscar por ID de transacción
router.get('/buscar/:transaccionId', async (req, res) => {
  try {
    const transaccion = await Transaccion.findOne({ 
      transaccionId: req.params.transaccionId 
    })
      .populate('cliente', 'nombre email')
      .populate('fondo', 'nombre categoria');

    if (!transaccion) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada con ese ID'
      });
    }

    res.json({
      success: true,
      data: transaccion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar transacción',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /transacciones/estadisticas/resumen:
 *   get:
 *     summary: Obtener resumen de estadísticas de transacciones
 *     tags: [Transacciones]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Estadísticas generales obtenidas
 */
// GET /api/transacciones/estadisticas/resumen - Estadísticas generales
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    let filtroFecha = {};
    if (fechaInicio || fechaFin) {
      filtroFecha.createdAt = {};
      if (fechaInicio) filtroFecha.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) filtroFecha.createdAt.$lte = new Date(fechaFin);
    }

    const estadisticas = await Transaccion.aggregate([
      { $match: filtroFecha },
      {
        $group: {
          _id: {
            tipo: '$tipo',
            estado: '$estado'
          },
          count: { $sum: 1 },
          totalValor: { $sum: '$valor' },
          valorPromedio: { $avg: '$valor' }
        }
      },
      {
        $group: {
          _id: '$_id.tipo',
          estados: {
            $push: {
              estado: '$_id.estado',
              count: '$count',
              totalValor: '$totalValor',
              valorPromedio: '$valorPromedio'
            }
          },
          totalTransacciones: { $sum: '$count' },
          montoTotal: { $sum: '$totalValor' }
        }
      }
    ]);

    // Obtener también conteos totales
    const totalTransacciones = await Transaccion.countDocuments(filtroFecha);
    const valorTotal = await Transaccion.aggregate([
      { $match: filtroFecha },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          totalTransacciones,
          valorTotal: valorTotal[0]?.total || 0
        },
        porTipo: estadisticas,
        periodo: {
          desde: fechaInicio || 'Inicio',
          hasta: fechaFin || 'Actualidad'
        }
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

// PUT /api/transacciones/:id/notificacion - Marcar notificación enviada
router.put('/:id/notificacion', async (req, res) => {
  try {
    const { tipoNotificacion = 'email' } = req.body;
    
    const transaccion = await Transaccion.findById(req.params.id);
    if (!transaccion) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    await transaccion.marcarNotificacionEnviada(tipoNotificacion);

    res.json({
      success: true,
      message: 'Notificación marcada como enviada',
      data: transaccion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar notificación',
      error: error.message
    });
  }
});

module.exports = router;
/**
 * @swagger
 * components:
 *   schemas:
 *     Transaccion:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         transaccionId:
 *           type: string
 *         cliente:
 *           type: string
 *         fondo:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [suscripcion, cancelacion]
 *         valor:
 *           type: number
 *         estado:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "64c3e2bca8d43b0b1e8d0f20"
 *         transaccionId: "123e4567-e89b-12d3-a456-426614174000"
 *         cliente: "64c3d6cba8d43b0b1e8d0e88"
 *         fondo: "64c3d6cba8d43b0b1e8d0e73"
 *         tipo: "suscripcion"
 *         valor: 250000
 *         estado: "confirmada"
 *         createdAt: "2024-07-01T12:00:00.000Z"
 */