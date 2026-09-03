const errorHandler = (err, req, res, next) => {
    console.error('Error global interceptado:', err);
    
    // Si el error viene de multer (ej. archivo no permitido)
    if (err.message && err.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({ error: err.message });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el límite de 5MB.' });
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({ 
        error: err.message || 'Ha ocurrido un error interno en el servidor.',
        detalle: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
