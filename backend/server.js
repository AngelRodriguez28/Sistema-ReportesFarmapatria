// B12-FIX: Cargar variables de entorno desde .env (credenciales fuera del código)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // BUG-C3 FIX

const SECRET_KEY = process.env.JWT_SECRET || 'farmapatria_super_secret_key_2026';

// Middleware de autenticación (BUG-C3 FIX)
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Falta el token de autenticación.' });
    
    // El token debe venir como "Bearer <token>"
    const bearerToken = token.split(' ')[1] || token;

    jwt.verify(bearerToken, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido o expirado.' });
        req.usuarioId = decoded.id;
        req.usuarioRol = decoded.rol_id;
        next();
    });
};

// --- 1. CONFIGURACIÓN DE MULTER ---
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

// A2: Filtro de archivos y límites
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, GIF o PDF.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});
// ---------------------------------------------------------

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
const PORT = 3000;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect(async (err, client, release) => {
    if (err) return console.error('Error al conectar con PostgreSQL:', err.stack);
    console.log('¡Conexión exitosa a la base de datos PostgreSQL!');
    // A3-FIX: Asegurar que exista la columna avatar
    try {
        await client.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);");
    } catch (e) {
        console.log("Aviso: No se pudo verificar la columna avatar de forma automática.");
    }
    release();
});

// ==========================================
// RUTA 1: Registro
// ==========================================
app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, cedula, fecha_nac, estado, gerencia, farmacia, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const estadoFinal = estado || 'Activo';

        // Auto-Asignación de roles según unidad de trabajo
        let rolAsignado = 2; // Por defecto: Jefe de Farmacia / Estándar
        if (gerencia && gerencia.includes('ESTADAL')) {
            rolAsignado = 6; // Gerentes Estadales
        }

        const query = `INSERT INTO usuarios (nombre, apellido, cedula, fecha_nacimiento, estado, gerencia, farmacia, email, password, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`;
        const result = await pool.query(query, [nombre, apellido, cedula, fecha_nac, estadoFinal, gerencia, farmacia, email, hashedPassword, rolAsignado]);
        res.status(201).json({ message: 'Usuario registrado con éxito', userId: result.rows[0].id });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'La cédula o correo ya existen.' });
        res.status(500).json({ error: 'Error interno.' });
    }
});
// ==========================================
// RUTA: Login
// ==========================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Correo no registrado.' });
        }
        const usuario = result.rows[0];

        // B4-FIX: Bloquear acceso a cuentas Inactivas o Bloqueadas
        if (usuario.estado === 'Inactivo' || usuario.estado === 'Bloqueado') {
            return res.status(403).json({ error: 'Tu cuenta está bloqueada o inactiva. Contacta al administrador del sistema.' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }
        
        // BUG-C3 FIX: Generar JWT
        const token = jwt.sign({ id: usuario.id, rol_id: usuario.rol_id }, SECRET_KEY, { expiresIn: '8h' });

        // No enviar el password al frontend
        const { password: _, ...usuarioSinPassword } = usuario;
        res.status(200).json({ message: 'Login exitoso', usuario: usuarioSinPassword, token: token });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// ==========================================
// RUTA: Recuperar Contraseña (BUG-C1 FIX temporal: validar cédula)
// ==========================================
app.put('/api/recuperar-contrasena', async (req, res) => {
    const { email, cedula, nuevaPassword } = req.body;
    try {
        if (!cedula) return res.status(400).json({ error: 'Debe proveer la cédula para verificar identidad.' });
        // 1. Verificar que el correo y la cédula pertenezcan a un usuario
        const result = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND cedula = $2', [email, cedula]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Datos no coinciden o no están registrados.' });
        }

        // 2. Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

        // 3. Actualizar la contraseña en la base de datos
        await pool.query('UPDATE usuarios SET password = $1 WHERE email = $2', [hashedPassword, email]);

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('Error en recuperar contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// ==========================================
// RUTA 2: Generación de Tickets 
// ==========================================
app.post('/api/tickets', verificarToken, upload.single('archivoAdjunto'), async (req, res) => {
    try {
        const { usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = req.body;
        const archivoRuta = req.file ? req.file.path : null;
        const estado_ticket = 'Pendiente';

        // A1-FIX: COUNT(*) se rompe si se borran tickets. Usamos MAX(id)
        const maxResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM tickets');
        const correlativo = parseInt(maxResult.rows[0].max_id, 10) + 1;

        // Formateamos el número para que siempre tenga 4 dígitos (Ej: REP-0001)
        const numero_reporte = 'REP-' + String(correlativo).padStart(4, '0');

        // 3. Insertamos el nuevo ticket en la base de datos
        const queryInsert = `
      INSERT INTO tickets (numero_reporte, usuario_id, numero_contacto, nivel_reporte, tipificacion_falla, unidad_reporta, unidad_afectada, anydesk, descripcion, archivo_adjunto, estado_ticket)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
    `;
        const resultInsert = await pool.query(queryInsert, [numero_reporte, usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion, archivoRuta, estado_ticket]);

        // 4. Disparamos la notificación de éxito para la campanita del usuario
        const msjNotificacion = `Generaste el ticket ${numero_reporte} exitosamente.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [usuario_id, msjNotificacion]);

        res.status(201).json({ mensaje: "Ticket creado exitosamente", ticket: resultInsert.rows[0] });
    } catch (error) {
        console.error("Error estructural al crear ticket:", error);
        res.status(500).json({ error: "Error interno al procesar la creación del ticket" });
    }
});
// ==========================================
// RUTA 4: Obtener Notificaciones (Historial de las últimas 10)
// ==========================================
app.get('/api/notificaciones/:usuarioId', verificarToken, async (req, res) => {
    try {
        // Quitamos el "AND leida = false" y agregamos "LIMIT 10" para tener un historial
        const result = await pool.query(
            'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha_creacion DESC LIMIT 10',
            [req.params.usuarioId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener notificaciones.' });
    }
});
// ==========================================
// RUTA EXTRA: Obtener los Tickets del Usuario
// ==========================================
app.get('/api/tickets/:usuarioId', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tickets WHERE usuario_id = $1 ORDER BY fecha_creacion DESC', [req.params.usuarioId]);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener los tickets.' }); }
});
// ==========================================
// RUTA ADMIN: Obtener TODOS los usuarios
// ==========================================
app.get('/api/admin/usuarios', verificarToken, async (req, res) => {
    try {
        const query = `SELECT id, nombre, apellido, email, cedula, gerencia, estado, rol_id FROM usuarios ORDER BY id ASC`;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ error: 'Error al obtener usuarios.' });
    }
});

// ==========================================
// RUTA ADMIN: Cambiar Rol de un Usuario
// ==========================================
app.put('/api/admin/usuarios/:id/rol', verificarToken, async (req, res) => {
    try {
        const { rol_id } = req.body;
        const result = await pool.query(`UPDATE usuarios SET rol_id = $1 WHERE id = $2 RETURNING *`, [rol_id, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(200).json({ message: 'Rol actualizado exitosamente', usuario: result.rows[0] });
    } catch (error) {
        console.error("Error cambiando rol:", error);
        res.status(500).json({ error: 'Error interno al cambiar rol.' });
    }
});

// ==========================================
// RUTA ADMIN: Cambiar Estado de un Usuario (Activo/Inactivo/Bloqueado)
// ==========================================
app.put('/api/admin/usuarios/:id/estado', verificarToken, async (req, res) => {
    try {
        const { estado } = req.body;
        const result = await pool.query(`UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *`, [estado, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(200).json({ message: 'Estado actualizado exitosamente', usuario: result.rows[0] });
    } catch (error) {
        console.error("Error cambiando estado:", error);
        res.status(500).json({ error: 'Error interno al cambiar estado.' });
    }
});

// ==========================================
// RUTA ADMIN: Obtener TODOS los tickets con datos del usuario
// ==========================================
app.get('/api/admin/tickets', verificarToken, async (req, res) => {
    try {
        // Hacemos un JOIN para unir la tabla tickets con la tabla usuarios
        const query = `
            SELECT t.*, u.nombre, u.apellido, u.gerencia as gerencia_usuario 
            FROM tickets t 
            JOIN usuarios u ON t.usuario_id = u.id 
            ORDER BY t.fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error obteniendo tickets para el admin:", error);
        res.status(500).json({ error: 'Error al obtener los tickets globales.' });
    }
});
// ==========================================
// RUTA ADMIN: Cambiar estatus a Resuelto y Notificar al Usuario
// ==========================================
app.put('/api/admin/tickets/:id/resolver', verificarToken, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // 1. Cambiamos el estatus del ticket
        const queryUpdate = `UPDATE tickets SET estado_ticket = 'Resuelto' WHERE id = $1 RETURNING *`;
        const result = await pool.query(queryUpdate, [ticketId]);
        const ticketActualizado = result.rows[0];

        // 2. Le creamos una notificación al usuario dueño del ticket
        const msj = `¡Buenas noticias! Tu ticket ${ticketActualizado.numero_reporte} ha sido marcado como RESUELTO por el equipo de soporte.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.usuario_id, msj]);

        res.status(200).json({ message: 'Ticket resuelto exitosamente' });
    } catch (error) {
        console.error("Error al resolver ticket:", error);
        res.status(500).json({ error: 'Error al cambiar estatus del ticket.' });
    }
});
// NUEVA RUTA: Apagar la campanita
app.put('/api/notificaciones/marcar-leidas/:usuarioId', verificarToken, async (req, res) => {
    try {
        await pool.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1', [req.params.usuarioId]);
        res.status(200).json({ message: 'Notificaciones leídas' });
    } catch (error) {
        console.error("Error en PUT marcar-leidas:", error);
        res.status(500).json({ error: 'Error al actualizar.' });
    }
});

// ==========================================
// RUTA: Actualizar Perfil de Usuario (B9-FIX + A4-FIX)
// ==========================================
app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    try {
        const { nombre, apellido, fecha_nac } = req.body;
        if (!nombre || !apellido) {
            return res.status(400).json({ error: 'Nombre y Apellido son obligatorios.' });
        }
        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, apellido = $2, fecha_nacimiento = $3 WHERE id = $4 RETURNING id, nombre, apellido, fecha_nacimiento, email, cedula, gerencia, farmacia, estado, rol_id, avatar',
            [nombre.trim(), apellido.trim(), fecha_nac, req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.status(200).json({ message: 'Perfil actualizado exitosamente.', usuario: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error interno al actualizar el perfil.' });
    }
});

// ==========================================
// RUTA: Subir Avatar de Perfil (A3-FIX)
// ==========================================
app.post('/api/usuarios/:id/avatar', verificarToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo o tipo no permitido.' });
        }
        const avatarUrl = `uploads/${req.file.filename}`;
        
        await pool.query('UPDATE usuarios SET avatar = $1 WHERE id = $2', [avatarUrl, req.params.id]);
        res.status(200).json({ message: 'Avatar actualizado exitosamente', avatarUrl });
    } catch (error) {
        console.error('Error al subir avatar:', error);
        res.status(500).json({ error: 'Error al subir el avatar.', detalle: error.message });
    }
});

app.listen(PORT, () => { console.log(`Servidor Backend corriendo en http://localhost:${PORT}`); });