# BTG Fondos API

API REST para la gestión de clientes y suscripciones a fondos de inversión. Desarrollada como parte de una prueba técnica en Node.js, Express y MongoDB.

---

##  Endpoint Público para Evaluación

La API está desplegada en AWS App Runner y puede ser accedida desde el siguiente dominio:

**[https://v4qsn6yjdj.us-east-2.awsapprunner.com](https://v4qsn6yjdj.us-east-2.awsapprunner.com)**

> **Nota de Seguridad**: MongoDB Atlas está temporalmente configurado para aceptar conexiones desde cualquier IP (`0.0.0.0/0`) únicamente durante el proceso de evaluación. Este acceso será revocado luego de finalizada la prueba.

---

## Funcionalidades Principales

- ✅ **Autenticación JWT** con roles de usuario
- ✅ **Gestión de clientes** con saldo inicial de $500,000 COP
- ✅ **5 fondos de inversión** precargados (FPV y FIC)
- ✅ **Transacciones** de suscripción y cancelación
- ✅ **Sistema de notificaciones** por email/SMS
- ✅ **Dashboard administrativo** con estadísticas
- ✅ **Validaciones** de saldo y montos mínimos
- ✅ **Historial completo** de transacciones

---

## Rutas Disponibles

### Autenticación
```
POST /api/auth/register     → Registro de cliente
POST /api/auth/login        → Inicio de sesión (devuelve JWT)
GET  /api/auth/me           → Datos del usuario autenticado (requiere JWT)
POST /api/auth/refresh      → Renovar token JWT
```

### Fondos
```
GET    /api/fondos                    → Lista de fondos activos
GET    /api/fondos/all                → Lista completa de fondos
GET    /api/fondos/:id                → Fondo por ID
POST   /api/fondos/:id/suscribir      → Suscripción a fondo (JWT)
DELETE /api/fondos/:id/cancelar       → Cancelar suscripción (JWT)
GET    /api/fondos/cliente/:clienteId → Fondos activos de un cliente
```

### Clientes
```
GET /api/clientes              → Listado de clientes activos
GET /api/clientes/:id          → Detalle de un cliente
GET /api/clientes/:id/saldo    → Saldo actual del cliente
GET /api/clientes/:id/fondos   → Fondos activos del cliente
PUT /api/clientes/:id          → Actualizar datos del cliente
```

### Transacciones
```
GET /api/transacciones                      → Todas las transacciones (paginado)
GET /api/transacciones/:id                  → Transacción específica
GET /api/transacciones/cliente/:clienteId   → Transacciones de un cliente
GET /api/transacciones/buscar/:transaccionId → Buscar por ID de transacción
GET /api/transacciones/estadisticas/resumen → Estadísticas generales
```

### Administración (requiere JWT + rol `admin`)
```
GET  /api/auth/admin/clientes        → Lista todos los clientes
GET  /api/auth/admin/estadisticas    → Estadísticas del sistema
POST /api/auth/create-admin          → Crear usuario administrador
POST /api/admin/init-fondos          → Inicializar fondos
GET  /api/admin/debug                → Información de debug
```

### Sistema
```
GET /              → Información de la API
GET /health        → Estado del servicio
```

---

## Datos de Prueba

### Fondos Precargados:
- **FPV_BTG_PACTUAL_RECAUDADORA** - Monto mínimo: $75,000
- **FPV_BTG_PACTUAL_ECOPETROL** - Monto mínimo: $125,000  
- **DEUDAPRIVADA** - Monto mínimo: $50,000
- **FDO-ACCIONES** - Monto mínimo: $250,000
- **FPV_BTG_PACTUAL_DINAMICA** - Monto mínimo: $100,000

### Ejemplo de Usuario de Prueba:
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "password": "123456"
}
```

---

## Prueba Rápida con Postman

### 1. Registrar Usuario:
```bash
POST https://v4qsn6yjdj.us-east-2.awsapprunner.com/api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com", 
  "password": "123456"
}
```

### 2. Ver Fondos Disponibles:
```bash
GET https://v4qsn6yjdj.us-east-2.awsapprunner.com/api/fondos
```

### 3. Suscribirse a un Fondo:
```bash
POST https://v4qsn6yjdj.us-east-2.awsapprunner.com/api/fondos/{FONDO_ID}/suscribir
Authorization: Bearer {JWT_TOKEN}
```

### 4. Ver Historial de Transacciones:
```bash
GET https://v4qsn6yjdj.us-east-2.awsapprunner.com/api/transacciones
Authorization: Bearer {JWT_TOKEN}
```

---

## Tecnologías Utilizadas

- **Backend**: Node.js + Express.js
- **Base de Datos**: MongoDB Atlas
- **ODM**: Mongoose
- **Autenticación**: JSON Web Tokens (JWT) + bcryptjs
- **Notificaciones**: Nodemailer (Email) + Twilio (SMS)
- **Deploy**: AWS App Runner + Amazon ECR
- **Infraestructura**: Docker + CloudFormation

---

## Instalación Local

```bash
# Clonar repositorio
git clone 
cd btg-fondos-api

# Instalar dependencias
npm install

# Configurar variables de entorno (.env)
PORT=3001
MONGO_URI=mongodb+srv://...
JWT_SECRET=tu_jwt_secret
NODE_ENV=development

# Ejecutar en desarrollo
npm run dev

# La API estará disponible en http://localhost:3001
```

### Scripts Disponibles:
```bash
npm run dev        # Desarrollo con nodemon
npm start          # Producción
npm test           # Ejecutar pruebas
npm run test:watch # Pruebas en modo watch
```

---

## Arquitectura del Proyecto

```
src/
├── index.js                 # Punto de entrada de la aplicación
├── models/                  # Modelos de Mongoose
│   ├── Cliente.js          # Schema de clientes
│   ├── Fondo.js            # Schema de fondos
│   └── Transaccion.js      # Schema de transacciones
├── routes/                  # Rutas de la API
│   ├── auth.js             # Autenticación y autorización
│   ├── clientes.js         # Gestión de clientes
│   ├── fondos.js           # Gestión de fondos
│   └── transacciones.js    # Historial y estadísticas
├── middleware/              # Middlewares personalizados
│   └── auth.js             # Verificación JWT y roles
└── services/                # Servicios externos
    └── notificationService.js # Sistema de notificaciones
```

---

## Seguridad Implementada

- ✅ **Encriptación de contraseñas** con bcrypt
- ✅ **Autenticación JWT** con expiración de 24h
- ✅ **Autorización por roles** (user/admin)
- ✅ **Validación de datos** con Mongoose
- ✅ **Sanitización de inputs**
- ✅ **CORS** configurado
- ✅ **Rate limiting** (producción)

---

## Características Avanzadas

- **Paginación** en listados de transacciones
- **Filtros avanzados** por fecha, tipo, estado
- **Estadísticas** en tiempo real con agregaciones MongoDB
- **Notificaciones automáticas** por email/SMS
- **Health checks** para monitoreo
- **Logging detallado** para debugging
- **Roles y permisos** granulares

---

## Autor

**Henry David Barrera Osorio**  
Desarrollador de Software  
Email: henrybarreraosorio@gmail.com  
GitHub: [@Henry00312](https://github.com/Henry00312)  

---

## Licencia

Este proyecto fue desarrollado como parte de una prueba técnica y es de uso académico/evaluativo.
