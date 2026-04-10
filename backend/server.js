const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
const upload = multer({ storage: storage });
// ---------------------------------------------------------

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
const PORT = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'SistemaReportesFP',
    password: 'p@ssw0rd',
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) return console.error('Error al conectar con PostgreSQL:', err.stack);
    console.log('¡Conexión exitosa a la base de datos PostgreSQL!');
    release();
});

// ==========================================
// RUTA 1: Registro
// ==========================================
app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, cedula, fecha_nac, estado, gerencia, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const estadoFinal = estado || 'Activo';
        const rolPredeterminado = 2; // Todo nuevo usuario entra como Usuario Normal
        const query = `INSERT INTO usuarios (nombre, apellido, cedula, fecha_nacimiento, estado, gerencia, email, password, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
        const result = await pool.query(query, [nombre, apellido, cedula, fecha_nac, estadoFinal, gerencia, email, hashedPassword, rolPredeterminado]);
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
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }
        // No enviar el password al frontend
        const { password: _, ...usuarioSinPassword } = usuario;
        res.status(200).json({ message: 'Login exitoso', usuario: usuarioSinPassword });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// ==========================================
// RUTA 2: Generación de Tickets (LÓGICA ESTRUCTURAL PURA)
// ==========================================
app.post('/api/tickets', upload.single('archivoAdjunto'), async (req, res) => {
  try {
    const { usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = req.body;
    const archivoRuta = req.file ? req.file.path : null;
    const estado_ticket = 'Pendiente';
    
    // 1. Buscamos el último ticket registrado en la base de datos
    const lastTicketResult = await pool.query(`
      SELECT numero_reporte 
      FROM tickets 
      WHERE numero_reporte LIKE 'REP-%'
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    let correlativo = 1;
    
    // Si ya existen tickets, extraemos el número del último y le sumamos 1
    if (lastTicketResult.rows.length > 0) {
        const ultimoCodigo = lastTicketResult.rows[0].numero_reporte;
        const extraerNumero = ultimoCodigo.match(/\d+/); // Extrae los números (Ej: de "REP-0045" saca "0045")
        
        if (extraerNumero) {
            correlativo = parseInt(extraerNumero[0], 10) + 1;
        }
    }
    
    // 2. Formateamos el número para que siempre tenga 4 ceros iniciales (Ej: REP-0001)
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
app.get('/api/notificaciones/:usuarioId', async (req, res) => {
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
app.get('/api/tickets/:usuarioId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tickets WHERE usuario_id = $1 ORDER BY fecha_creacion DESC', [req.params.usuarioId]);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener los tickets.' }); }
});
// ==========================================
// RUTA ADMIN: Obtener TODOS los usuarios
// ==========================================
app.get('/api/admin/usuarios', async (req, res) => {
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
app.put('/api/admin/usuarios/:id/rol', async (req, res) => {
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
app.put('/api/admin/usuarios/:id/estado', async (req, res) => {
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
app.get('/api/admin/tickets', async (req, res) => {
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
app.put('/api/admin/tickets/:id/resolver', async (req, res) => {
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
app.put('/api/notificaciones/marcar-leidas/:usuarioId', async (req, res) => {
    try {
        await pool.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1', [req.params.usuarioId]);
        res.status(200).json({ message: 'Notificaciones leídas' });
    } catch (error) { 
        console.error("Error en PUT marcar-leidas:", error);
        res.status(500).json({ error: 'Error al actualizar.' }); 
    }
});

app.listen(PORT, () => { console.log(`Servidor Backend corriendo en http://localhost:${PORT}`); });