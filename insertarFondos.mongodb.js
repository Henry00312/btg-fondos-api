/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use('fondosDB');

// Insert a few documents into the sales collection.
db.fondos.insertMany([
  { nombre: 'FPV_BTG_PACTUAL_RECAUDADORA', montoMinimo: 75000, categoria: 'FPV' },
  { nombre: 'FPV_BTG_PACTUAL_ECOPETROL', montoMinimo: 125000, categoria: 'FPV' },
  { nombre: 'DEUDAPRIVADA', montoMinimo: 50000, categoria: 'FIC' },
  { nombre: 'FDO-ACCIONES', montoMinimo: 250000, categoria: 'FIC' },
  { nombre: 'FPV_BTG_PACTUAL_DINAMICA', montoMinimo: 100000, categoria: 'FPV' }
])

