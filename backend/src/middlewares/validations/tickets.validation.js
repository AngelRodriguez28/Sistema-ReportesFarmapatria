const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const generarTicketValidation = [
    body('usuario_id').custom((value, { req }) => {
        if (!value && !req.usuarioId) {
            throw new Error('El ID del usuario es obligatorio');
        }
        return true;
    }),
    body('contacto').notEmpty().withMessage('El número de contacto es obligatorio'),
    body('nivelReporte').notEmpty().withMessage('El nivel de reporte es obligatorio'),
    body('tipificacionFalla').notEmpty().withMessage('La tipificación de la falla es obligatoria'),
    body('unidadReporta').notEmpty().withMessage('La unidad que reporta es obligatoria'),
    body('unidadAfectada').notEmpty().withMessage('La unidad afectada es obligatoria'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria').isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres'),
    validate
];

const editarTicketValidation = [
    body('contacto').notEmpty().withMessage('El número de contacto es obligatorio'),
    body('nivelReporte').notEmpty().withMessage('El nivel de reporte es obligatorio'),
    body('tipificacionFalla').notEmpty().withMessage('La tipificación de la falla es obligatoria'),
    body('unidadReporta').notEmpty().withMessage('La unidad que reporta es obligatoria'),
    body('unidadAfectada').notEmpty().withMessage('La unidad afectada es obligatoria'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria').isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres'),
    validate
];

module.exports = {
    generarTicketValidation,
    editarTicketValidation
};
