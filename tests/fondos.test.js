// const request = require('supertest');
// process.env.JWT_SECRET = 'test_secret_key_for_jest';
// process.env.NODE_ENV = 'test';
// const app = require('../src/index');

// describe('💰 Gestión de Fondos', () => {
//   let authToken;
//   let userId;
//   let fondoId;

//   const testUser = {
//     nombre: 'Test User',
//     email: 'fondos@example.com',
//     password: 'password123'
//   };

//   beforeEach(async () => {
//     try {
//       // Inicializar fondos de prueba
//       console.log('🔄 Inicializando fondos...');
//       const initResponse = await request(app)
//         .post('/api/admin/init-fondos');
      
//       console.log('📊 Init fondos response:', {
//         status: initResponse.status,
//         body: initResponse.body
//       });

//       // Crear y autenticar usuario
//       console.log('🔄 Registrando usuario...');
//       const authResponse = await request(app)
//         .post('/api/auth/register')
//         .send(testUser);

//       console.log('🔐 Auth response:', {
//         status: authResponse.status,
//         success: authResponse.body.success,
//         hasToken: !!authResponse.body.data?.token,
//         hasCliente: !!authResponse.body.data?.cliente
//       });

//       authToken = authResponse.body.data.token;
//       userId = authResponse.body.data.cliente.id;

//       // Obtener ID de un fondo para tests
//       console.log('🔄 Obteniendo fondos...');
//       const fondosResponse = await request(app)
//         .get('/api/fondos');
      
//       console.log('💰 Fondos response:', {
//         status: fondosResponse.status,
//         count: fondosResponse.body.data?.length,
//         fondos: fondosResponse.body.data?.map(f => ({ id: f._id, nombre: f.nombre, monto: f.montoMinimo }))
//       });
      
//       fondoId = fondosResponse.body.data[0]._id;
//       console.log('✅ Setup completo - fondoId:', fondoId);
//     } catch (error) {
//       console.error('❌ Error en setup:', error);
//       throw error;
//     }
//   });

//   describe('POST /api/fondos/:fondoId/suscribir', () => {
// test('Debe suscribir usuario autenticado a fondo con saldo suficiente', async () => {
//   const response = await request(app)
//     .post(`/api/fondos/${fondoId}/suscribir`)
//     .set('Authorization', `Bearer ${authToken}`);
    
//   // This will show us exactly what the API is returning
//   expect({
//     actualStatus: response.status,
//     actualBody: response.body,
//     fondoId: fondoId,
//     hasAuthToken: !!authToken,
//     authTokenLength: authToken?.length || 0,
//     requestPath: `/api/fondos/${fondoId}/suscribir`
//   }).toEqual({
//     expectedStatus: 201,
//     debugMessage: 'This should fail and show actual API response above'
//   });
// });

//     test('Debe fallar suscripción duplicada', async () => {
//       console.log('🧪 Test suscripción duplicada...');
      
//       // Primera suscripción
//       console.log('🔄 Primera suscripción...');
//       const firstResponse = await request(app)
//         .post(`/api/fondos/${fondoId}/suscribir`)
//         .set('Authorization', `Bearer ${authToken}`);
        
//       console.log('📤 Primera suscripción:', {
//         status: firstResponse.status,
//         success: firstResponse.body.success
//       });

//       // Segunda suscripción al mismo fondo
//       console.log('🔄 Segunda suscripción (debe fallar)...');
//       const response = await request(app)
//         .post(`/api/fondos/${fondoId}/suscribir`)
//         .set('Authorization', `Bearer ${authToken}`);

//       console.log('📤 Segunda suscripción:', {
//         status: response.status,
//         body: response.body
//       });

//       if (response.status === 500) {
//         console.log('🚨 ERROR 500 en suscripción duplicada:', {
//           message: response.body.message,
//           error: response.body.error
//         });
//       }

//       expect(response.status).toBe(400);
//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toBe('Ya está suscrito a este fondo');
//     });
//   });

//   describe('DELETE /api/fondos/:fondoId/cancelar', () => {
//     beforeEach(async () => {
//       console.log('🔄 Preparando cancelación - suscribiendo primero...');
//       const subscribeResponse = await request(app)
//         .post(`/api/fondos/${fondoId}/suscribir`)
//         .set('Authorization', `Bearer ${authToken}`);
        
//       console.log('📤 Suscripción previa:', {
//         status: subscribeResponse.status,
//         success: subscribeResponse.body.success
//       });
//     });

//     test('Debe cancelar suscripción y devolver dinero', async () => {
//       console.log('🧪 Test cancelación...');
      
//       const response = await request(app)
//         .delete(`/api/fondos/${fondoId}/cancelar`)
//         .set('Authorization', `Bearer ${authToken}`);

//       console.log('📤 Cancelación response:', {
//         status: response.status,
//         body: response.body
//       });

//       if (response.status !== 200) {
//         console.log('🚨 Error en cancelación:', {
//           expectedStatus: 200,
//           actualStatus: response.status,
//           message: response.body.message,
//           error: response.body.error
//         });
//       }

//       expect(response.status).toBe(200);
//       expect(response.body.success).toBe(true);
//       expect(response.body.message).toContain('Cancelación exitosa');
//       expect(response.body.data.cliente.saldoAnterior).toBe(450000);
//       expect(response.body.data.cliente.saldoActual).toBe(500000);
//       expect(response.body.data.transaccion.tipo).toBe('cancelacion');
//       expect(response.body.data.fondo.montoDevuelto).toBe(50000);
//     });
//   });

//   // Test adicional para verificar el estado de la base de datos
//   describe('Database State Debug', () => {
//     test('Debe verificar estado de fondos y usuario', async () => {
//       console.log('🔍 Verificando estado de la base de datos...');
      
//       // Verificar usuario
//       const userResponse = await request(app)
//         .get('/api/auth/me')
//         .set('Authorization', `Bearer ${authToken}`);
      
//       console.log('👤 Estado del usuario:', {
//         status: userResponse.status,
//         saldo: userResponse.body.data?.saldo,
//         id: userResponse.body.data?._id
//       });

//       // Verificar fondos
//       const fondosResponse = await request(app)
//         .get('/api/fondos');
      
//       console.log('💰 Estado de fondos:', {
//         status: fondosResponse.status,
//         count: fondosResponse.body.data?.length,
//         firstFondo: fondosResponse.body.data?.[0]
//       });

//       expect(userResponse.status).toBe(200);
//       expect(fondosResponse.status).toBe(200);
//     });
//   });
// });


const request = require('supertest');
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.NODE_ENV = 'test';
const app = require('../src/index');

describe('💰 Gestión de Fondos', () => {
  let authToken;
  let userId;
  let fondoId;

  const testUser = {
    nombre: 'Test User',
    email: 'fondos@example.com',
    password: 'password123'
  };

  beforeEach(async () => {
    try {
      // Inicializar fondos de prueba
      const initResponse = await request(app)
        .post('/api/admin/init-fondos');

      // Crear y autenticar usuario
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      authToken = authResponse.body.data.token;
      userId = authResponse.body.data.cliente.id;

      // Obtener ID de un fondo para tests
      const fondosResponse = await request(app)
        .get('/api/fondos');
      
      fondoId = fondosResponse.body.data[0]._id; // DEUDAPRIVADA (50000)
    } catch (error) {
      console.error('❌ Error en setup:', error);
      throw error;
    }
  });

  describe('GET /api/fondos', () => {
    test('Debe obtener lista de fondos disponibles', async () => {
      const response = await request(app)
        .get('/api/fondos');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.count).toBe(5);
      
      // Verificar estructura de fondo
      const fondo = response.body.data[0];
      expect(fondo).toHaveProperty('nombre');
      expect(fondo).toHaveProperty('montoMinimo');
      expect(fondo).toHaveProperty('categoria');
      expect(['FPV', 'FIC']).toContain(fondo.categoria);
    });

    test('Debe incluir todos los fondos BTG requeridos', async () => {
      const response = await request(app)
        .get('/api/fondos');

      const nombres = response.body.data.map(f => f.nombre);
      
      expect(nombres).toContain('FPV_BTG_PACTUAL_RECAUDADORA');
      expect(nombres).toContain('FPV_BTG_PACTUAL_ECOPETROL');
      expect(nombres).toContain('DEUDAPRIVADA');
      expect(nombres).toContain('FDO-ACCIONES');
      expect(nombres).toContain('FPV_BTG_PACTUAL_DINAMICA');
    });
  });

  describe('POST /api/fondos/:fondoId/suscribir', () => {
    test('Debe suscribir usuario autenticado a fondo con saldo suficiente', async () => {
      const response = await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);
        
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Suscripción exitosa');
      expect(response.body.data.cliente.saldoAnterior).toBe(500000);
      expect(response.body.data.cliente.saldoActual).toBe(450000); // 500000 - 50000
      expect(response.body.data.transaccion.tipo).toBe('suscripcion');
      expect(response.body.data.transaccion.valor).toBe(50000); // DEUDAPRIVADA monto
    });

    test('Debe fallar suscripción sin autenticación', async () => {
      const response = await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token de acceso requerido');
    });

    test('Debe fallar suscripción duplicada', async () => {
      // Primera suscripción
      await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      // Segunda suscripción al mismo fondo
      const response = await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ya está suscrito a este fondo');
    });

test('Debe fallar con saldo insuficiente', async () => {
      // Encontrar fondo más caro (FDO-ACCIONES = 250000)
      const fondosResponse = await request(app).get('/api/fondos');
      const fondos = fondosResponse.body.data;
      
      // Estrategia: suscribirse a todos los fondos para agotar el saldo
      // Saldo inicial: 500000
      
      // 1. DEUDAPRIVADA: 50000 (queda 450000)
      await request(app)
        .post(`/api/fondos/${fondos.find(f => f.nombre === 'DEUDAPRIVADA')._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);
        
      // 2. FPV_BTG_PACTUAL_RECAUDADORA: 75000 (queda 375000)
      await request(app)
        .post(`/api/fondos/${fondos.find(f => f.nombre === 'FPV_BTG_PACTUAL_RECAUDADORA')._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);
        
      // 3. FPV_BTG_PACTUAL_DINAMICA: 100000 (queda 275000)
      await request(app)
        .post(`/api/fondos/${fondos.find(f => f.nombre === 'FPV_BTG_PACTUAL_DINAMICA')._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);
        
      // 4. FPV_BTG_PACTUAL_ECOPETROL: 125000 (queda 150000)
      await request(app)
        .post(`/api/fondos/${fondos.find(f => f.nombre === 'FPV_BTG_PACTUAL_ECOPETROL')._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      // Ahora el usuario tiene saldo = 150000
      // 5. Intentar suscribirse a FDO-ACCIONES (250000) sin saldo suficiente
      const fondoCaro = fondos.find(f => f.nombre === 'FDO-ACCIONES');
      const response = await request(app)
        .post(`/api/fondos/${fondoCaro._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No tiene saldo disponible');
      expect(response.body.data.faltante).toBeDefined();
    });
  });

  describe('DELETE /api/fondos/:fondoId/cancelar', () => {
    beforeEach(async () => {
      // Suscribirse primero para poder cancelar
      await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('Debe cancelar suscripción y devolver dinero', async () => {
      const response = await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cancelación exitosa');
      expect(response.body.data.cliente.saldoAnterior).toBe(450000);
      expect(response.body.data.cliente.saldoActual).toBe(500000); // Dinero devuelto
      expect(response.body.data.transaccion.tipo).toBe('cancelacion');
      expect(response.body.data.fondo.montoDevuelto).toBe(50000);
    });

    test('Debe fallar cancelación sin suscripción previa', async () => {
      // Cancelar primero
      await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);

      // Intentar cancelar de nuevo
      const response = await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No está suscrito a este fondo');
    });

    test('Debe fallar cancelación sin autenticación', async () => {
      const response = await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token de acceso requerido');
    });
  });

  describe('Validaciones de negocio', () => {
    test('Debe mantener consistencia entre saldo y fondos activos', async () => {
      // Verificar saldo inicial
      const initialUser = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(initialUser.body.data.saldo).toBe(500000);
      expect(initialUser.body.data.fondosActivos).toHaveLength(0);

      // Suscribirse a un fondo
      await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verificar cambios
      const updatedUser = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(updatedUser.body.data.saldo).toBe(450000);
      expect(updatedUser.body.data.fondosActivos).toHaveLength(1);
      expect(updatedUser.body.data.fondosActivos[0].montoInvertido).toBe(50000);

      // Cancelar suscripción
      await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verificar restauración
      const finalUser = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalUser.body.data.saldo).toBe(500000);
      expect(finalUser.body.data.fondosActivos).toHaveLength(0);
    });

    test('Debe permitir múltiples suscripciones a fondos diferentes', async () => {
      const fondosResponse = await request(app).get('/api/fondos');
      const fondos = fondosResponse.body.data;
      
      // Suscribirse a DEUDAPRIVADA (50000)
      const fondo1 = fondos.find(f => f.nombre === 'DEUDAPRIVADA');
      await request(app)
        .post(`/api/fondos/${fondo1._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      // Suscribirse a FPV_BTG_PACTUAL_RECAUDADORA (75000)
      const fondo2 = fondos.find(f => f.nombre === 'FPV_BTG_PACTUAL_RECAUDADORA');
      const response2 = await request(app)
        .post(`/api/fondos/${fondo2._id}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(201);
      expect(response2.body.data.cliente.saldoActual).toBe(375000); // 500000 - 50000 - 75000

      // Verificar que tiene 2 fondos activos
      const userResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(userResponse.body.data.fondosActivos).toHaveLength(2);
    });

    test('Debe validar montos mínimos correctamente', async () => {
      const fondosResponse = await request(app).get('/api/fondos');
      const fondos = fondosResponse.body.data;

      // Verificar que cada fondo tiene su monto mínimo correcto
      const expectedMontos = {
        'DEUDAPRIVADA': 50000,
        'FPV_BTG_PACTUAL_RECAUDADORA': 75000,
        'FPV_BTG_PACTUAL_ECOPETROL': 125000,
        'FPV_BTG_PACTUAL_DINAMICA': 100000,
        'FDO-ACCIONES': 250000
      };

      fondos.forEach(fondo => {
        expect(fondo.montoMinimo).toBe(expectedMontos[fondo.nombre]);
      });
    });
  });

  describe('Transacciones y historial', () => {
    test('Debe crear transacciones correctas para suscripción y cancelación', async () => {
      // Suscripción
      const subscribeResponse = await request(app)
        .post(`/api/fondos/${fondoId}/suscribir`)
        .set('Authorization', `Bearer ${authToken}`);

      const transaccionSuscripcion = subscribeResponse.body.data.transaccion;
      expect(transaccionSuscripcion.tipo).toBe('suscripcion');
      expect(transaccionSuscripcion.valor).toBe(50000);
      expect(transaccionSuscripcion.id).toBeDefined();
      expect(transaccionSuscripcion.fecha).toBeDefined();

      // Cancelación
      const cancelResponse = await request(app)
        .delete(`/api/fondos/${fondoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);

      const transaccionCancelacion = cancelResponse.body.data.transaccion;
      expect(transaccionCancelacion.tipo).toBe('cancelacion');
      expect(transaccionCancelacion.valor).toBe(50000);
      expect(transaccionCancelacion.id).toBeDefined();
      expect(transaccionCancelacion.fecha).toBeDefined();
    });
  });
});