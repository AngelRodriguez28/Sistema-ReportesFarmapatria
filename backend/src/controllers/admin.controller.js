const pool = require('../config/db');

const obtenerUsuarios = async (req, res, next) => {
    try {
        const query = `SELECT id, nombre, apellido, email, cedula, gerencia, estado, rol_id FROM usuarios ORDER BY id ASC`;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

const cambiarRolUsuario = async (req, res, next) => {
    try {
        const { rol_id } = req.body;
        const result = await pool.query(`UPDATE usuarios SET rol_id = $1 WHERE id = $2 RETURNING *`, [rol_id, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(200).json({ message: 'Rol actualizado exitosamente', usuario: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

const cambiarEstadoUsuario = async (req, res, next) => {
    try {
        const { estado } = req.body;
        const result = await pool.query(`UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *`, [estado, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(200).json({ message: 'Estado actualizado exitosamente', usuario: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

const obtenerTicketsGlobales = async (req, res, next) => {
    try {
        const query = `
            SELECT t.*, u.nombre, u.apellido, u.gerencia as gerencia_usuario, 
                   tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido
            FROM tickets t 
            JOIN usuarios u ON t.usuario_id = u.id 
            LEFT JOIN usuarios tec ON t.tecnico_id = tec.id
            ORDER BY t.fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

const tomarTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const tecnicoId = req.usuarioId; 

        const queryUpdate = `UPDATE tickets SET estado_ticket = 'En Progreso', tecnico_id = $1 WHERE id = $2 RETURNING *`;
        const result = await pool.query(queryUpdate, [tecnicoId, ticketId]);
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket no encontrado' });
        const ticketActualizado = result.rows[0];

        const msj = `Tu ticket ${ticketActualizado.numero_reporte} ha sido tomado por un técnico y se encuentra 'En Progreso'.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.usuario_id, msj]);

        res.status(200).json({ message: 'Ticket tomado exitosamente', ticket: ticketActualizado });
    } catch (error) {
        next(error);
    }
};

const resolverTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;

        const queryUpdate = `UPDATE tickets SET estado_ticket = 'Sin Confirmar' WHERE id = $1 RETURNING *`;
        const result = await pool.query(queryUpdate, [ticketId]);
        const ticketActualizado = result.rows[0];

        const msj = `Tu ticket ${ticketActualizado.numero_reporte} ha sido resuelto. Por favor confirma la resolución en tu panel.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.usuario_id, msj]);

        res.status(200).json({ message: 'Ticket enviado a confirmación exitosamente' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerUsuarios,
    cambiarRolUsuario,
    cambiarEstadoUsuario,
    obtenerTicketsGlobales,
    tomarTicket,
    resolverTicket
};
