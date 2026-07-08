const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { ROLES, ESTADOS_USUARIO } = require('../config/constants');

const registrarUsuarioService = async (datosUsuario) => {
    const { nombre, apellido, cedula, fecha_nac, estado, gerencia, farmacia, email, password } = datosUsuario;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const estadoFinal = estado || ESTADOS_USUARIO.ACTIVO;

    let rolAsignado = ROLES.JEFE_FARMACIA_ESTANDAR;
    if (gerencia && gerencia.includes('ESTADAL')) {
        rolAsignado = ROLES.GERENTE_ESTADAL;
    }

    const query = `INSERT INTO usuarios (nombre, apellido, cedula, fecha_nacimiento, estado, gerencia, farmacia, email, password, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`;
    const result = await pool.query(query, [nombre, apellido, cedula, fecha_nac, estadoFinal, gerencia, farmacia, email, hashedPassword, rolAsignado]);
    
    return result.rows[0].id;
};

const loginService = async (email, password) => {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        throw { status: 401, message: 'Correo no registrado.' };
    }
    const usuario = result.rows[0];

    if (usuario.estado === ESTADOS_USUARIO.INACTIVO || usuario.estado === ESTADOS_USUARIO.BLOQUEADO) {
        throw { status: 403, message: 'Tu cuenta está bloqueada o inactiva. Contacta al administrador del sistema.' };
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
        throw { status: 401, message: 'Contraseña incorrecta.' };
    }
    
    return usuario;
};

const recuperarContrasenaService = async (email, cedula, nuevaPassword) => {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND cedula = $2', [email, cedula]);
    if (result.rows.length === 0) {
        throw { status: 404, message: 'Datos no coinciden o no están registrados.' };
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    await pool.query('UPDATE usuarios SET password = $1 WHERE email = $2', [hashedPassword, email]);
};

const actualizarPerfilService = async (id, datosActualizacion) => {
    const { nombre, apellido, fecha_nac } = datosActualizacion;
    const result = await pool.query(
        'UPDATE usuarios SET nombre = $1, apellido = $2, fecha_nacimiento = $3 WHERE id = $4 RETURNING id, nombre, apellido, fecha_nacimiento, email, cedula, gerencia, farmacia, estado, rol_id, avatar',
        [nombre.trim(), apellido.trim(), fecha_nac, id]
    );
    if (result.rowCount === 0) throw { status: 404, message: 'Usuario no encontrado.' };
    return result.rows[0];
};

const subirAvatarService = async (id, avatarUrl) => {
    await pool.query('UPDATE usuarios SET avatar = $1 WHERE id = $2', [avatarUrl, id]);
};

module.exports = {
    registrarUsuarioService,
    loginService,
    recuperarContrasenaService,
    actualizarPerfilService,
    subirAvatarService
};
