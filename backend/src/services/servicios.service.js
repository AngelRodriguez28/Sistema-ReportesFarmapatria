const pool = require('../config/db');

const crearReporteServicio = async (datos, archivoRuta) => {
    const { usuario_id, tipo_servicio, proveedor, tiempo_sin_servicio, descripcion } = datos;
    const estado = 'Pendiente';

    // Obtener el siguiente valor de la secuencia para asegurar sincronización atómica
    const seqRes = await pool.query("SELECT nextval('reportes_servicios_id_seq') AS next_id");
    let nextId = parseInt(seqRes.rows[0].next_id, 10);

    // Si la secuencia estuviese desfasada respecto a IDs existentes, resincronizar
    const checkExist = await pool.query('SELECT id FROM reportes_servicios WHERE id = $1', [nextId]);
    if (checkExist.rowCount > 0) {
        const maxRes = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM reportes_servicios');
        nextId = parseInt(maxRes.rows[0].max_id, 10) + 1;
        await pool.query("SELECT setval('reportes_servicios_id_seq', $1, true)", [nextId]);
    }

    const numero_reporte = 'SER-' + String(nextId).padStart(4, '0');

    const query = `
      INSERT INTO reportes_servicios 
      (id, numero_reporte, usuario_id, tipo_servicio, proveedor, tiempo_sin_servicio, descripcion, archivo_adjunto, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
    `;
    const result = await pool.query(query, [
        nextId, numero_reporte, usuario_id, tipo_servicio, proveedor, tiempo_sin_servicio, descripcion, archivoRuta, estado
    ]);

    const msj = `Generaste el reporte de servicio ${numero_reporte} exitosamente.`;
    await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [usuario_id, msj]);

    return result.rows[0];
};

const listarPorUsuario = async (usuario_id) => {
    const query = `
        SELECT rs.*, tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido 
        FROM reportes_servicios rs 
        LEFT JOIN usuarios tec ON rs.tecnico_id = tec.id
        WHERE rs.usuario_id = $1 
        ORDER BY rs.fecha_creacion DESC
    `;
    const result = await pool.query(query, [usuario_id]);
    return result.rows;
};

const listarTodos = async () => {
    const query = `
        SELECT rs.*, u.nombre as usr_nombre, u.apellido as usr_apellido, u.farmacia, u.gerencia,
        tec.nombre as tecnico_nombre, tec.apellido as tecnico_apellido 
        FROM reportes_servicios rs 
        LEFT JOIN usuarios u ON rs.usuario_id = u.id
        LEFT JOIN usuarios tec ON rs.tecnico_id = tec.id
        ORDER BY rs.fecha_creacion DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

const tomarReporte = async (reporte_id, tecnico_id) => {
    const query = `UPDATE reportes_servicios SET tecnico_id = $1, estado = 'En Progreso' WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [tecnico_id, reporte_id]);
    const reporte = result.rows[0];

    if (reporte) {
        const msj = `El técnico ha tomado tu reporte de servicio ${reporte.numero_reporte}.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [reporte.usuario_id, msj]);
    }
    return reporte;
};

const resolverReporte = async (reporte_id) => {
    const query = `UPDATE reportes_servicios SET estado = 'Resuelto' WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [reporte_id]);
    const reporte = result.rows[0];

    if (reporte) {
        const msj = `Tu reporte de servicio ${reporte.numero_reporte} ha sido marcado como Resuelto.`;
        await pool.query('INSERT INTO notificaciones (usuario_id, mensaje, leida) VALUES ($1, $2, false)', [reporte.usuario_id, msj]);
    }
    return reporte;
};

module.exports = {
    crearReporteServicio,
    listarPorUsuario,
    listarTodos,
    tomarReporte,
    resolverReporte
};
