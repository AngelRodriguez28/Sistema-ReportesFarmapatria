const pool = require('../config/db');
const { ESTADOS_TICKET } = require('../config/constants');

const generarTicketService = async (datosTicket, archivoRuta, imagenAnydeskRuta) => {
    const { usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = datosTicket;
    const estado_ticket = ESTADOS_TICKET.PENDIENTE;

    // Obtener el siguiente valor de la secuencia para asegurar sincronización atómica
    const seqRes = await pool.query("SELECT nextval('tickets_id_seq') AS next_id");
    let nextId = parseInt(seqRes.rows[0].next_id, 10);

    // Si la secuencia estuviese desfasada respecto a IDs existentes, resincronizar
    const checkExist = await pool.query('SELECT id FROM tickets WHERE id = $1', [nextId]);
    if (checkExist.rowCount > 0) {
        const maxRes = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM tickets');
        nextId = parseInt(maxRes.rows[0].max_id, 10) + 1;
        await pool.query("SELECT setval('tickets_id_seq', $1, true)", [nextId]);
    }

    const numero_reporte = 'REP-' + String(nextId).padStart(4, '0');

    const queryInsert = `
      INSERT INTO tickets (id, numero_reporte, usuario_id, numero_contacto, nivel_reporte, tipificacion_falla, unidad_reporta, unidad_afectada, anydesk, descripcion, archivo_adjunto, estado_ticket, imagen_anydesk)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;
    `;
    const resultInsert = await pool.query(queryInsert, [
        nextId, numero_reporte, usuario_id, contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion, archivoRuta, estado_ticket, imagenAnydeskRuta
    ]);

    const msjNotificacion = `Generaste el ticket ${numero_reporte} exitosamente.`;
    await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [usuario_id, msjNotificacion]);

    return resultInsert.rows[0];
};

const editarTicketService = async (ticketId, datosTicket, archivoRuta, imagenAnydeskRuta) => {
    const { contacto, nivelReporte, tipificacionFalla, unidadReporta, unidadAfectada, anydesk, descripcion } = datosTicket;

    let setFields = [
        "numero_contacto = $1", "tipificacion_falla = $2", "unidad_afectada = $3", 
        "anydesk = $4", "descripcion = $5", "nivel_reporte = $6", "unidad_reporta = $7"
    ];
    let queryParams = [contacto, tipificacionFalla, unidadAfectada, anydesk, descripcion, nivelReporte, unidadReporta];
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
    const queryUpdate = `
        UPDATE tickets 
        SET ${setFields.join(', ')}
        WHERE id = $${paramCount} AND estado_ticket = '${ESTADOS_TICKET.PENDIENTE}' RETURNING *`;
        
    const result = await pool.query(queryUpdate, queryParams);
    
    if (result.rowCount === 0) {
        throw { status: 400, message: 'El ticket no existe o ya no está Pendiente.' };
    }
    return result.rows[0];
};

const obtenerTicketsUsuarioService = async (usuarioId) => {
    const query = `
        SELECT t.*, tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido 
        FROM tickets t 
        LEFT JOIN usuarios tec ON t.tecnico_id = tec.id
        WHERE t.usuario_id = $1 
        ORDER BY t.fecha_creacion DESC
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows;
};

const confirmarResolucionService = async (ticketId) => {
    const queryUpdate = `UPDATE tickets SET estado_ticket = '${ESTADOS_TICKET.RESUELTO}' WHERE id = $1 RETURNING *`;
    const result = await pool.query(queryUpdate, [ticketId]);
    const ticketActualizado = result.rows[0];

    if (ticketActualizado && ticketActualizado.tecnico_id) {
        const msj = `El usuario confirmó la resolución del ticket ${ticketActualizado.numero_reporte}.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.tecnico_id, msj]);
    }
};

const reportarErrorPersistenteService = async (ticketId) => {
    const queryUpdate = `UPDATE tickets SET estado_ticket = '${ESTADOS_TICKET.EN_PROGRESO}' WHERE id = $1 RETURNING *`;
    const result = await pool.query(queryUpdate, [ticketId]);
    const ticketActualizado = result.rows[0];

    if (ticketActualizado && ticketActualizado.tecnico_id) {
        const msj = `El usuario ha reportado un Error Persistente en el ticket ${ticketActualizado.numero_reporte}. El ticket ha regresado a 'En Progreso'.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [ticketActualizado.tecnico_id, msj]);
    }
};

const obtenerNotificacionesService = async (usuarioId) => {
    const result = await pool.query(
        'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha_creacion DESC LIMIT 10',
        [usuarioId]
    );
    return result.rows;
};

const marcarNotificacionesLeidasService = async (usuarioId) => {
    await pool.query('UPDATE notificaciones SET leida = true WHERE usuario_id = $1', [usuarioId]);
};

module.exports = {
    generarTicketService,
    editarTicketService,
    obtenerTicketsUsuarioService,
    confirmarResolucionService,
    reportarErrorPersistenteService,
    obtenerNotificacionesService,
    marcarNotificacionesLeidasService
};
