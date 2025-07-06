const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const clienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Formato de teléfono inválido']
  },
  saldo: {
    type: Number,
    default: 500000, // COP $500.000 según requerimientos
    min: [0, 'El saldo no puede ser negativo'],
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'El saldo debe ser un número positivo'
    }
  },
  preferenciaNotificacion: {
    type: String,
    enum: ['email', 'sms'],
    default: 'email'
  },
  fondosActivos: [{
    fondo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fondo',
      required: true
    },
    montoInvertido: {
      type: Number,
      required: true,
      min: 0
    },
    fechaSuscripcion: {
      type: Date,
      default: Date.now
    }
  }],
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
clienteSchema.index({ email: 1 });
clienteSchema.index({ 'fondosActivos.fondo': 1 });

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

// Método para verificar saldo suficiente
clienteSchema.methods.tieneSaldoSuficiente = function(monto) {
  return this.saldo >= monto;
};

// Método para suscribirse a fondo
clienteSchema.methods.suscribirseAFondo = function(fondoId, monto) {
  if (!this.tieneSaldoSuficiente(monto)) {
    throw new Error('No tiene saldo disponible para vincularse al fondo');
  }
  
  // Verificar si ya está suscrito
  const suscripcionExistente = this.fondosActivos.find(
    fa => fa.fondo.toString() === fondoId.toString()
  );
  
  if (suscripcionExistente) {
    throw new Error('Ya está suscrito a este fondo');
  }
  
  this.saldo -= monto;
  this.fondosActivos.push({
    fondo: fondoId,
    montoInvertido: monto,
    fechaSuscripcion: new Date()
  });
};

// Método para cancelar suscripción
clienteSchema.methods.cancelarSuscripcion = function(fondoId) {
  const indice = this.fondosActivos.findIndex(
    fa => fa.fondo.toString() === fondoId.toString()
  );
  
  if (indice === -1) {
    throw new Error('No está suscrito a este fondo');
  }
  
  const suscripcion = this.fondosActivos[indice];
  this.saldo += suscripcion.montoInvertido; // Devolver el dinero
  this.fondosActivos.splice(indice, 1);
  
  return suscripcion.montoInvertido;
};

// Virtual para obtener fondos activos populados
clienteSchema.virtual('fondosActivosPopulados', {
  ref: 'Fondo',
  localField: 'fondosActivos.fondo',
  foreignField: '_id'
});

// Asegurar que los virtuals se incluyan en JSON
clienteSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password; // No incluir password en respuestas JSON
    return ret;
  }
});

module.exports = mongoose.model('Cliente', clienteSchema);