const pool = require('../config/db');

const generarTicket = async (req, res, next) => {
    try {
        const { usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = req.body;
        const archivoRuta = req.files && req.files['archivoAdjunto'] ? req.files['archivoAdjunto'][0].path : null;
        const imagenAnydeskRuta = req.files && req.files['imagenAnydesk'] ? req.files['imagenAnydesk'][0].path : null;
        const estado_ticket = 'Pendiente';

        const maxResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM tickets');
        const correlativo = parseInt(maxResult.rows[0].max_id, 10) + 1;
        const numero_reporte = 'REP-' + String(correlativo).padStart(4, '0');

        const queryInsert = `
      INSERT INTO tickets (numero_reporte, usuario_id, numero_contacto, nivel_reporte, tipificacion_falla, unidad_reporta, unidad_afectada, anydesk, descripcion, archivo_adjunto, estado_ticket, imagen_anydesk)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
    `;
        const resultInsert = await pool.query(queryInsert, [numero_reporte, usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion, archivoRuta, estado_ticket, imagenAnydeskRuta]);

        const msjNotificacion = `Generaste el ticket ${numero_reporte} exitosamente.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [usuario_id, msjNotificacion]);

        res.status(201).json({ mensaje: "Ticket creado exitosamente", ticket: resultInsert.rows[0] });
    } catch (error) {
        next(error);
    }
};

const editarTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const { contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = req.body;
        const archivoRuta = req.files && req.files['archivoAdjunto'] ? req.files['archivoAdjunto'][0].path : null;
        const imagenAnydeskRuta = req.files && req.files['imagenAnydesk'] ? req.files['imagenAnydesk'][0].path : null;

        let queryUpdate;
        let queryParams;

        let setFields = [
            "numero_contacto = $1", "tipificacion_falla = $2", "unidad_afectada = $3", 
            "anydesk = $4", "descripcion = $5", "nivel_reporte = $6", "unidad_reporta = $7"
        ];
        queryParams = [contacto, tipificacionFalla, unidadAfectada, anydesk, descripcion, nivelReporte, unidadReporta];
        let paramCount = 8;

        if (archivoRuta) {
            setFields.push(`archivo_adjunto = $${paramCount++}`);
            queryParams.push(archivoRuta);
        }
        if (imagenAnydeskRuta) {
            setFields.push(`imagen_anydesk = $${paramCount++}`);
            queryParams.push(imagenAnydeskRuta);
        }

        queryParams.push(ticketId);
        queryUpdate = `
            UPDATE tickets 
            SET ${setFields.join(', ')}
            WHERE id = $${paramCount} AND estado_ticket = 'Pendiente' RETURNING *`;
            
        const result = await pool.query(queryUpdate, queryParams);
        
        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'El ticket no existe o ya no está Pendiente.' });
        }
        res.status(200).json({ message: 'Ticket actualizado exitosamente', ticket: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

const obtenerTicketsUsuario = async (req, res, next) => {
    try {
        const query = `
            SELECT t.*, tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido 
            FROM tickets t 
            LEFT JOIN usuarios tec ON t.tecnico_id = tec.id
            WHERE t.usuario_id = $1 
            ORDER BY t.fecha_creacion DESC
        `;
        const result = await pool.query(query, [req.params.usuarioId]);
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

const confirmarResolucion = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        
        const queryUpdate = `UPDATE tickets SET estado_ticket = 'Resuelto' WHERE id = $1 RETURNING *`;
        const result = await pool.query(queryUpdate, [ticketId]);
        const ticketActualizado = result.rows[0];

        if (ticketActualizado && ticketActualizado.tecnico_id) {
            const msj = `El usuario confirmó la resolución del ticket ${ticketActualizado.numero_reporte}.`;
            await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.tecnico_id, msj]);
        }
        res.status(200).json({ message: 'Requerimiento confirmado exitosamente' });
    } catch (error) {
        next(error);
    }
};

const reportarErrorPersistente = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        
        const queryUpdate = `UPDATE tickets SET estado_ticket = 'En Progreso' WHERE id = $1 RETURNING *`;
        const result = await pool.query(queryUpdate, [ticketId]);
        const ticketActualizado = result.rows[0];

        if (ticketActualizado && ticketActualizado.tecnico_id) {
            const msj = `El usuario ha reportado un Error Persistente en el ticket ${ticketActualizado.numero_reporte}. El ticket ha regresado a 'En Progreso'.`;
            await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.tecnico_id, msj]);
        }
        res.status(200).json({ message: 'Error persistente reportado exitosamente' });
    } catch (error) {
        next(error);
    }
};

const obtenerNotificaciones = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha_creacion DESC LIMIT 10',
            [req.params.usuarioId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

const marcarNotificacionesLeidas = async (req, res, next) => {
    try {
        await pool.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1', [req.params.usuarioId]);
        res.status(200).json({ message: 'Notificaciones leídas' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generarTicket,
    editarTicket,
    obtenerTicketsUsuario,
    confirmarResolucion,
    reportarErrorPersistente,
    obtenerNotificaciones,
    marcarNotificacionesLeidas
};
