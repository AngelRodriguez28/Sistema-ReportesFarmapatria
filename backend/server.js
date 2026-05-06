require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Configuración de BD (Se autoconecta al importar)
require('./src/config/db');

// Middlewares Globales
const errorHandler = require('./src/middlewares/errorHandler.middleware');

// Rutas Modulares
const authRoutes = require('./src/routes/auth.routes');
const ticketsRoutes = require('./src/routes/tickets.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();

// Middlewares Base
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Registro de Rutas (Mantenemos la compatibilidad con el frontend)
app.use('/api', authRoutes);          // /api/registro, /api/login, /api/usuarios/...
app.use('/api', ticketsRoutes);       // /api/tickets/..., /api/notificaciones/...
app.use('/api/admin', adminRoutes);   // /api/admin/usuarios/..., /api/admin/tickets/...

// Interceptor Global de Errores (Debe ir siempre después de las rutas)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { 
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`); 
});