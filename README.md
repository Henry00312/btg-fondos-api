#  BTG Fondos API

API REST para la gestión de clientes y suscripciones a fondos de inversión. Desarrollada como parte de una prueba técnica en Node.js, Express y MongoDB.

---

## Endpoint Público para Evaluación

La API está desplegada en AWS App Runner y puede ser accedida desde el siguiente dominio:

**[https://v4qsn6yjdj.us-east-2.awsapprunner.com](https://v4qsn6yjdj.us-east-2.awsapprunner.com)**

> MongoDB Atlas está temporalmente configurado para aceptar conexiones desde cualquier IP (`0.0.0.0/0`) únicamente durante el proceso de evaluación.  
> Este acceso será revocado luego de finalizada la prueba.

---

## Rutas disponibles

### Autenticación
- `POST /api/auth/register` → Registro de cliente
- `POST /api/auth/login` → Inicio de sesión (devuelve JWT)
- `GET /api/auth/me` → Datos del usuario autenticado (requiere JWT)

### Fondos
- `GET /api/fondos` → Lista de fondos activos
- `GET /api/fondos/all` → Lista completa de fondos
- `GET /api/fondos/:id` → Fondo por ID
- `POST /api/fondos/:id/suscribir` → Suscripción a fondo (JWT)
- `DELETE /api/fondos/:id/cancelar` → Cancelar suscripción (JWT)

### Clientes
- `GET /api/clientes` → Listado de clientes
- `GET /api/clientes/:id` → Detalle de un cliente

### Transacciones
- `GET /api/transacciones` → Todas las transacciones
- `GET /api/transacciones/cliente/:clienteId` → Transacciones de un cliente

### Admin (JWT + rol `admin`)
- `GET /api/admin/clientes`
- `GET /api/admin/estadisticas`
- `POST /api/admin/create-admin`
- `POST /api/admin/init-fondos`
- `GET /api/admin/debug`

---

## Prueba rápida con Postman

Puedes usar este token JWT de ejemplo para probar endpoints protegidos (válido por 24h tras login):
```
Authorization: Bearer <JWT AQUÍ>
```
---

## Tecnologías

- Node.js + Express
- MongoDB Atlas
- Mongoose ODM
- JSON Web Tokens (JWT)
- AWS App Runner (deploy)

---

## Scripts útiles

```bash
npm install       # Instala dependencias
npm run dev       # Inicia en modo desarrollo (localhost:3001)
```

---

##  Autor

Henry David Barrera Osorio  
Desarrollador de Software
GitHub: [@Henry00312](https://github.com/Henry00312)
