const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Importar modelos
const Fondo = require('../models/Fondo');
const Cliente = require('../models/Cliente');
const Transaccion = require('../models/Transaccion');

// Importar middlewares
const { authenticateToken } = require('../middleware/auth');

// Importar servicios
const notificationService = require('../services/notificationService');

/**
 * @swagger
 * /fondos:
 *   get:
 *     summary: Obtener todos los fondos disponibles
 *     tags: [Fondos]
 *     responses:
 *       200:
 *         description: Lista de fondos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fondo'
 */
// GET /api/fondos - Obtener todos los fondos
router.get('/', async (req, res) => {
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

// GET /api/fondos/all - Ver TODOS los fondos (sin filtro activo)
router.get('/all', async (req, res) => {
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
    res.json({ success: true, data: fondo });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener fondo',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /fondos/{fondoId}/suscribir:
 *   post:
 *     summary: Suscribirse a un fondo
 *     tags: [Fondos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fondoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del fondo al que se desea suscribir
 *     responses:
 *       201:
 *         description: Suscripción exitosa
 *       400:
 *         description: Error en la suscripción (ya suscrito o saldo insuficiente)
 *       401:
 *         description: No autorizado
 */
// POST /api/fondos/:fondoId/suscribir - Suscribirse a un fondo
router.post('/:fondoId/suscribir', authenticateToken, async (req, res) => {
  console.log('🚀 [SUSCRIPCIÓN] Iniciando proceso...');
  
  try {
    const clienteId = req.user.id;
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

    // Enviar notificación
    try {
      await notificationService.enviarNotificacionSuscripcion(cliente, fondo, transaccion);
    } catch (notificationError) {
      console.log('⚠️ Error enviando notificación:', notificationError.message);
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
      debug: process.env.NODE_ENV === 'test' ? {
        originalError: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

/**
 * @swagger
 * /fondos/{fondoId}/cancelar:
 *   delete:
 *     summary: Cancelar suscripción a un fondo
 *     tags: [Fondos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fondoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del fondo a cancelar
 *     responses:
 *       200:
 *         description: Cancelación exitosa
 *       400:
 *         description: No está suscrito a este fondo
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
// DELETE /api/fondos/:fondoId/cancelar - Cancelar suscripción
router.delete('/:fondoId/cancelar', authenticateToken, async (req, res) => {
  try {
    const clienteId = req.user.id;
    const { fondoId } = req.params;

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

    console.log('💾 [CANCELACIÓN] Guardando cambios en BD...');

    try {
      await cliente.save();
      await transaccion.save();
      
      console.log(`✅ [CANCELACIÓN] Exitosa - ${cliente.nombre} canceló ${fondo.nombre} (+$${suscripcion.montoInvertido})`);
        
    } catch (saveError) {
      console.error('❌ [CANCELACIÓN] Error guardando:', saveError);
      cliente.saldo = saldoAnterior;
      cliente.fondosActivos.splice(suscripcionIndex, 0, suscripcion);
      throw saveError;
    }

    // Enviar notificación
    try {
      await notificationService.enviarNotificacionCancelacion(cliente, fondo, transaccion, suscripcion.montoInvertido);
    } catch (notificationError) {
      console.log('⚠️ Error enviando notificación:', notificationError.message);
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

module.exports = router;
/**
 * @swagger
 * components:
 *   schemas:
 *     Fondo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         nombre:
 *           type: string
 *         montoMinimo:
 *           type: number
 *         categoria:
 *           type: string
 *       example:
 *         _id: "64c3d6cba8d43b0b1e8d0e73"
 *         nombre: "FPV_BTG_PACTUAL_DINAMICA"
 *         montoMinimo: 100000
 *         categoria: "FPV"
 */

/**
 * @swagger
 * /fondos/cliente/{clienteId}:
 *   get:
 *     summary: Obtener los fondos activos de un cliente
 *     tags: [Fondos]
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Fondos del cliente obtenidos correctamente
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/cliente/:clienteId', async (req, res) => {
  const { clienteId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(clienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    const cliente = await Cliente.findById(clienteId).populate('fondosActivos.fondo');

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Fondos activos del cliente ${cliente.nombre}`,
      data: cliente.fondosActivos
    });

  } catch (error) {
    console.error('❌ Error al obtener fondos del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los fondos del cliente',
      error: error.message
    });
  }
});
