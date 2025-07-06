const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const transaccionSchema = new mongoose.Schema({
  transaccionId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true,
    index: true
  },
  cliente: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: [true, 'El cliente es requerido'],
    index: true
  },
  fondo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Fondo', 
    required: [true, 'El fondo es requerido'],
    index: true
  },
  tipo: { 
    type: String, 
    enum: {
      values: ['suscripcion', 'cancelacion'],
      message: 'El tipo debe ser suscripcion o cancelacion'
    },
    required: [true, 'El tipo de transacción es requerido']
  },
  valor: { 
    type: Number, 
    required: [true, 'El valor es requerido'],
    min: [0, 'El valor no puede ser negativo'],
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'El valor debe ser mayor a 0'
    }
  },
  estado: {
    type: String,
    enum: {
      values: ['pendiente', 'completada', 'fallida'],
      message: 'Estado inválido'
    },
    default: 'completada'
  },
  descripcion: {
    type: String,
    trim: true
  },
  // Datos adicionales para seguimiento
  metadata: {
    saldoAnterior: {
      type: Number,
      min: 0
    },
    saldoPosterior: {
      type: Number,
      min: 0
    },
    nombreFondo: {
      type: String,
      trim: true
    },
    nombreCliente: {
      type: String,
      trim: true
    },
    notificacionEnviada: {
      type: Boolean,
      default: false
    },
    tipoNotificacion: {
      type: String,
      enum: ['email', 'sms'],
      default: 'email'
    },
    errorMessage: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true, // Crea automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para optimizar consultas
transaccionSchema.index({ cliente: 1, createdAt: -1 });
transaccionSchema.index({ fondo: 1, tipo: 1 });
transaccionSchema.index({ tipo: 1, estado: 1 });
transaccionSchema.index({ createdAt: -1 });

// Virtual para obtener fecha formateada
transaccionSchema.virtual('fechaFormateada').get(function() {
  return this.createdAt.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual para obtener descripción automática
transaccionSchema.virtual('descripcionAuto').get(function() {
  if (this.descripcion) return this.descripcion;
  
  const accion = this.tipo === 'suscripcion' ? 'Suscripción a' : 'Cancelación de';
  const fondo = this.metadata?.nombreFondo || 'fondo';
  return `${accion} ${fondo}`;
});

// Método estático para obtener historial de cliente
transaccionSchema.statics.obtenerHistorialCliente = function(clienteId, opciones = {}) {
  const { 
    pagina = 1, 
    limite = 10, 
    tipo, 
    estado,
    fechaInicio,
    fechaFin
  } = opciones;
  
  const skip = (pagina - 1) * limite;
  let filtros = { cliente: clienteId };
  
  if (tipo) filtros.tipo = tipo;
  if (estado) filtros.estado = estado;
  
  if (fechaInicio || fechaFin) {
    filtros.createdAt = {};
    if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
    if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
  }
  
  return this.find(filtros)
    .populate('fondo', 'nombre categoria montoMinimo')
    .populate('cliente', 'nombre email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limite);
};

// Método estático para crear transacción de suscripción
transaccionSchema.statics.crearSuscripcion = async function(clienteId, fondoId, valor, metadata = {}) {
  const transaccion = new this({
    cliente: clienteId,
    fondo: fondoId,
    tipo: 'suscripcion',
    valor: valor,
    descripcion: `Suscripción al fondo ${metadata.nombreFondo || ''}`,
    metadata: {
      ...metadata,
      saldoAnterior: metadata.saldoAnterior,
      saldoPosterior: metadata.saldoPosterior,
      nombreFondo: metadata.nombreFondo,
      nombreCliente: metadata.nombreCliente
    }
  });
  
  return await transaccion.save();
};

// Método estático para crear transacción de cancelación
transaccionSchema.statics.crearCancelacion = async function(clienteId, fondoId, valor, metadata = {}) {
  const transaccion = new this({
    cliente: clienteId,
    fondo: fondoId,
    tipo: 'cancelacion',
    valor: valor,
    descripcion: `Cancelación del fondo ${metadata.nombreFondo || ''}`,
    metadata: {
      ...metadata,
      saldoAnterior: metadata.saldoAnterior,
      saldoPosterior: metadata.saldoPosterior,
      nombreFondo: metadata.nombreFondo,
      nombreCliente: metadata.nombreCliente
    }
  });
  
  return await transaccion.save();
};

// Método para marcar notificación como enviada
transaccionSchema.methods.marcarNotificacionEnviada = function(tipoNotificacion = 'email') {
  this.metadata.notificacionEnviada = true;
  this.metadata.tipoNotificacion = tipoNotificacion;
  return this.save();
};

// Método para marcar como fallida
transaccionSchema.methods.marcarComoFallida = function(mensajeError) {
  this.estado = 'fallida';
  this.metadata.errorMessage = mensajeError;
  return this.save();
};

// Middleware pre-save para validaciones adicionales
transaccionSchema.pre('save', function(next) {
  // Generar descripción automática si no existe
  if (!this.descripcion) {
    const accion = this.tipo === 'suscripcion' ? 'Suscripción a' : 'Cancelación de';
    const fondo = this.metadata?.nombreFondo || 'fondo';
    this.descripcion = `${accion} ${fondo}`;
  }
  
  next();
});

// Middleware post-save para logging
transaccionSchema.post('save', function(doc) {
  console.log(`📄 Transacción ${doc.tipo} creada: ${doc.transaccionId} - $${doc.valor.toLocaleString()}`);
});

module.exports = mongoose.model('Transaccion', transaccionSchema);