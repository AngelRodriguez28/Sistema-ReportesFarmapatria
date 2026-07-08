const pool = require('../config/db');
const { ROLES, ESTADOS_TICKET } = require('../config/constants');

const obtenerUsuariosService = async () => {
    const query = `SELECT id, nombre, apellido, email, cedula, gerencia, estado, rol_id FROM usuarios ORDER BY id ASC`;
    const result = await pool.query(query);
    return result.rows;
};

const cambiarRolUsuarioService = async (id, rol_id) => {
    const result = await pool.query(`UPDATE usuarios SET rol_id = $1 WHERE id = $2 RETURNING *`, [rol_id, id]);
    if (result.rowCount === 0) throw { status: 404, message: 'Usuario no encontrado' };
    return result.rows[0];
};

const cambiarEstadoUsuarioService = async (id, estado) => {
    const result = await pool.query(`UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *`, [estado, id]);
    if (result.rowCount === 0) throw { status: 404, message: 'Usuario no encontrado' };
    return result.rows[0];
};

const obtenerTicketsGlobalesService = async () => {
    const query = `
        SELECT t.*, u.nombre, u.apellido, u.gerencia as gerencia_usuario, 
               tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido
        FROM tickets t 
        JOIN usuarios u ON t.usuario_id = u.id 
        LEFT JOIN usuarios tec ON t.tecnico_id = tec.id
        ORDER BY t.fecha_creacion DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

const tomarTicketService = async (ticketId, tecnicoId, usuarioRol) => {
    if (Number(usuarioRol) === ROLES.SUPER_ADMINISTRADOR) {
        throw { status: 403, message: 'Acceso Denegado. Los Súper Administradores no pueden tomar casos.' };
    }

    const queryUpdate = `UPDATE tickets SET estado_ticket = '${ESTADOS_TICKET.EN_PROGRESO}', tecnico_id = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(queryUpdate, [tecnicoId, ticketId]);
    
    if (result.rowCount === 0) throw { status: 404, message: 'Ticket no encontrado' };
    const ticketActualizado = result.rows[0];

    const msj = `Tu ticket ${ticketActualizado.numero_reporte} ha sido tomado por un técnico y se encuentra 'En Progreso'.`;
    await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.usuario_id, msj]);

    return ticketActualizado;
};

const resolverTicketService = async (ticketId, usuarioRol) => {
    if (Number(usuarioRol) === ROLES.SUPER_ADMINISTRADOR) {
        throw { status: 403, message: 'Acceso Denegado. Los Súper Administradores no pueden resolver casos.' };
    }

    const queryUpdate = `UPDATE tickets SET estado_ticket = '${ESTADOS_TICKET.SIN_CONFIRMAR}' WHERE id = $1 RETURNING *`;
    const result = await pool.query(queryUpdate, [ticketId]);
    const ticketActualizado = result.rows[0];

    const msj = `Tu ticket ${ticketActualizado.numero_reporte} ha sido resuelto. Por favor confirma la resolución en tu panel.`;
    await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.usuario_id, msj]);
};

module.exports = {
    obtenerUsuariosService,
    cambiarRolUsuarioService,
    cambiarEstadoUsuarioService,
    obtenerTicketsGlobalesService,
    tomarTicketService,
    resolverTicketService
};
