const serviciosService = require('../services/servicios.service');

const crearReporte = async (req, res, next) => {
    try {
        const datos = {
            ...req.body,
            usuario_id: req.usuarioId || req.body.usuario_id
        };
        const archivoRuta = req.file ? req.file.path.replace(/\\/g, '/') : null;
        
        const reporte = await serviciosService.crearReporteServicio(datos, archivoRuta);
        res.status(201).json({ message: 'Reporte de servicio generado con éxito', reporte });
    } catch (error) {
        next(error);
    }
};

const obtenerPorUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reportes = await serviciosService.listarPorUsuario(id);
        res.status(200).json(reportes);
    } catch (error) {
        next(error);
    }
};

const listarTodos = async (req, res, next) => {
    try {
        const reportes = await serviciosService.listarTodos();
        res.status(200).json(reportes);
    } catch (error) {
        next(error);
    }
};

const tomarReporte = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tecnico_id = req.body.tecnico_id || req.usuarioId;
        const reporte = await serviciosService.tomarReporte(id, tecnico_id);
        res.status(200).json({ message: 'Reporte tomado exitosamente', reporte });
    } catch (error) {
        next(error);
    }
};

const resolverReporte = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reporte = await serviciosService.resolverReporte(id);
        res.status(200).json({ message: 'Reporte resuelto exitosamente', reporte });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    crearReporte,
    obtenerPorUsuario,
    listarTodos,
    tomarReporte,
    resolverReporte
};
