const errorHandler = (err, req, res, next) => {
    console.error('Error global interceptado:', err);
    
    // Si el error viene de multer (ej. archivo no permitido)
    if (err.message && err.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({ error: err.message });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el límite de 5MB.' });
    }

    // Respuesta genérica para errores no controlados
    res.status(500).json({ 
        error: 'Ha ocurrido un error interno en el servidor.',
        // En desarrollo podríamos enviar err.message, pero en prod es mejor ocultarlo
        detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler;
