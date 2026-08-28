const pool = require('../config/db');

const auditRootAction = async (req, res, next) => {
    // Si no es un método de escritura o si no es ROOT, pasar al siguiente
    if (req.method === 'GET' || Number(req.usuarioRol) !== 1) {
        return next();
    }

    // Interceptar la respuesta original (monkey patch a res.send / res.json)
    // para registrar solo si la acción fue exitosa.
    const originalJson = res.json;
    
    res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const userId = req.usuarioId;
            const accion = `${req.method} ${req.originalUrl}`;
            const endpoint = req.originalUrl;
            
            // Clonar el body para evitar modificarlo o guardar passwords
            const detalles = { ...req.body };
            if (detalles.password) delete detalles.password;

            pool.query(
                'INSERT INTO auditoria_root (usuario_id, accion, endpoint, detalles) VALUES ($1, $2, $3, $4)',
                [userId, accion, endpoint, JSON.stringify(detalles)]
            ).catch(err => console.error('Error al guardar log de auditoría ROOT:', err));
        }
        
        // Llamar a la función json original
        originalJson.call(this, data);
    };

    next();
};

module.exports = {
    auditRootAction
};
