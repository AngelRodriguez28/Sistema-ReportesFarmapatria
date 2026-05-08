const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middlewares/auth.middleware');

const registrarUsuario = async (req, res, next) => {
    const { nombre, apellido, cedula, fecha_nac, estado, gerencia, farmacia, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const estadoFinal = estado || 'Activo';

        let rolAsignado = 2; // Jefe de Farmacia / Estándar
        if (gerencia && gerencia.includes('ESTADAL')) {
            rolAsignado = 6; // Gerentes Estadales
        }

        const query = `INSERT INTO usuarios (nombre, apellido, cedula, fecha_nacimiento, estado, gerencia, farmacia, email, password, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`;
        const result = await pool.query(query, [nombre, apellido, cedula, fecha_nac, estadoFinal, gerencia, farmacia, email, hashedPassword, rolAsignado]);
        res.status(201).json({ message: 'Usuario registrado con éxito', userId: result.rows[0].id });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'La cédula o correo ya existen.' });
        next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Correo no registrado.' });
        }
        const usuario = result.rows[0];

        if (usuario.estado === 'Inactivo' || usuario.estado === 'Bloqueado') {
            return res.status(403).json({ error: 'Tu cuenta está bloqueada o inactiva. Contacta al administrador del sistema.' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }
        
        const token = jwt.sign({ id: usuario.id, rol_id: usuario.rol_id }, SECRET_KEY, { expiresIn: '8h' });

        const { password: _, ...usuarioSinPassword } = usuario;
        res.status(200).json({ message: 'Login exitoso', usuario: usuarioSinPassword, token: token });
    } catch (error) {
        next(error);
    }
};

const recuperarContrasena = async (req, res, next) => {
    const { email, cedula, nuevaPassword } = req.body;
    try {
        if (!cedula) return res.status(400).json({ error: 'Debe proveer la cédula para verificar identidad.' });
        const result = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND cedula = $2', [email, cedula]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Datos no coinciden o no están registrados.' });
        }

        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
        await pool.query('UPDATE usuarios SET password = $1 WHERE email = $2', [hashedPassword, email]);

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        next(error);
    }
};

// Actualizar Perfil de Usuario
const actualizarPerfil = async (req, res, next) => {
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
        next(error);
    }
};

// Subir Avatar
const subirAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo o tipo no permitido.' });
        }
        const avatarUrl = `uploads/${req.file.filename}`;
        
        await pool.query('UPDATE usuarios SET avatar = $1 WHERE id = $2', [avatarUrl, req.params.id]);
        res.status(200).json({ message: 'Avatar actualizado exitosamente', avatarUrl });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registrarUsuario,
    login,
    recuperarContrasena,
    actualizarPerfil,
    subirAvatar
};
