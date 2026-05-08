# TicoAutos — Servicio GraphQL

Servicio de consultas GraphQL para la plataforma TicoAutos.
Conectado a la misma base de datos MongoDB Atlas y al mismo sistema de
autenticación JWT que el REST API.

## Tecnologías
- Node.js + Express
- express-graphql
- MongoDB Atlas (Mongoose)
- JWT (mismo secret que el REST API)

## Requisitos previos
- Node.js v18 o superior
- Backend REST configurado (comparten la misma base de datos y JWT_SECRET)

## Instalación
```bash
npm install
```

## Configuración
Crear un archivo `.env` en la carpeta `Server/` con:

DATABASE_URL=        # Misma URL que el Backend REST
JWT_SECRET=          # Mismo secret que el Backend REST
PORT=4000

## Ejecución
```bash
npm start
```
El servicio corre en `http://localhost:4000/graphql`.
La interfaz visual GraphiQL está disponible en esa misma URL.

## Queries disponibles
| Query | Auth | Descripción |
|-------|------|-------------|
| vehicles(...filtros) | No | Lista vehículos con filtros y paginación |
| vehicle(id) | No | Detalle de un vehículo |
| me | Sí | Datos del usuario autenticado |
| myVehicles | Sí | Vehículos del usuario |
| questionThread(vehicleId, askerId?) | Sí | Hilo de mensajes |
| questionsAsked | Sí | Preguntas realizadas por el usuario |
| questionsReceived | Sí | Preguntas recibidas en los vehículos del usuario |

## Autenticación
Incluir el token JWT en el header de cada petición:

El mismo token generado por el REST API funciona aquí.

<img width="1467" height="736" alt="Progra final diagrama" src="https://github.com/user-attachments/assets/314037aa-9fc5-43b0-8cbf-a57f6c4c34b2" />
