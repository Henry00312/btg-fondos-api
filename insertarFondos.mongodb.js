use('fondosDB');

db.fondos.insertMany([
  { nombre: 'FPV_BTG_PACTUAL_RECAUDADORA', montoMinimo: 75000, categoria: 'FPV' },
  { nombre: 'FPV_BTG_PACTUAL_ECOPETROL', montoMinimo: 125000, categoria: 'FPV' },
  { nombre: 'DEUDAPRIVADA', montoMinimo: 50000, categoria: 'FIC' },
  { nombre: 'FDO-ACCIONES', montoMinimo: 250000, categoria: 'FIC' },
  { nombre: 'FPV_BTG_PACTUAL_DINAMICA', montoMinimo: 100000, categoria: 'FPV' }
])

