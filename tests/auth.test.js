const request = require('supertest');

process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.NODE_ENV = 'test';

const app = require('../src/index');

describe('🔐 Autenticación', () => {
  const testUser = {
    nombre: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    telefono: '3001234567'
  };

  describe('POST /api/auth/register', () => {
    test('Debe registrar un nuevo usuario exitosamente', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cliente registrado exitosamente');
      expect(response.body.data.cliente.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.cliente.nombre).toBe(testUser.nombre);
      expect(response.body.data.cliente.saldo).toBe(500000);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.cliente.password).toBeUndefined(); // No debe devolver password
    });

    test('Debe fallar al registrar usuario con email duplicado', async () => {
      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Segundo registro con mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ya existe un cliente con este email');
    });

    test('Debe fallar sin campos requeridos', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Falta nombre y password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Nombre, email y contraseña son requeridos');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario para tests de login
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    test('Debe hacer login exitosamente con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login exitoso');
      expect(response.body.data.cliente.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.cliente.password).toBeUndefined();
    });

    test('Debe fallar con email inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Credenciales inválidas');
    });

    test('Debe fallar con contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Credenciales inválidas');
    });

    test('Debe fallar sin credenciales', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email y contraseña son requeridos');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Registrar y obtener token
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      authToken = response.body.data.token;
    });

    test('Debe obtener información del usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.nombre).toBe(testUser.nombre);
      expect(response.body.data.password).toBeUndefined();
    });

    test('Debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token de acceso requerido');
    });

    test('Debe fallar con token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_invalido');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token inválido o expirado');
    });
  });
});