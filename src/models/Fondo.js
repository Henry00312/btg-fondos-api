const mongoose = require('mongoose');

const fondoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre del fondo es requerido'],
    unique: true,
    trim: true
  },
  montoMinimo: { 
    type: Number, 
    required: [true, 'El monto mínimo es requerido'],
    min: [0, 'El monto mínimo no puede ser negativo']
  },
  categoria: { 
    type: String, 
    enum: {
      values: ['FPV', 'FIC'],
      message: 'La categoría debe ser FPV o FIC'
    },
    required: [true, 'La categoría es requerida']
  },
  activo: { 
    type: Boolean, 
    default: true 
  },
  descripcion: {
    type: String,
    trim: true
  },
  rentabilidadAnual: {
    type: Number,
    min: 0,
    max: 100
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
fondoSchema.index({ categoria: 1, activo: 1 });
fondoSchema.index({ nombre: 1 });

// Virtual para obtener descripción automática
fondoSchema.virtual('descripcionCompleta').get(function() {
  if (this.descripcion) return this.descripcion;
  
  const categoriaDesc = this.categoria === 'FPV' ? 'Fondo de Pensiones Voluntarias' : 'Fondo de Inversión Colectiva';
  return `${this.nombre} - ${categoriaDesc}`;
});

// Método estático para obtener fondos activos
fondoSchema.statics.obtenerFondosActivos = function() {
  return this.find({ activo: true }).sort({ nombre: 1 });
};

// Método estático para obtener fondos por categoría
fondoSchema.statics.obtenerPorCategoria = function(categoria) {
  return this.find({ categoria, activo: true }).sort({ montoMinimo: 1 });
};

// Middleware pre-save para logging
fondoSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`💰 Nuevo fondo creado: ${this.nombre} (${this.categoria})`);
  }
  next();
});

module.exports = mongoose.model('Fondo', fondoSchema);