const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const registrarUsuarioValidation = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('apellido').notEmpty().withMessage('El apellido es obligatorio').trim(),
    body('cedula').notEmpty().withMessage('La cédula es obligatoria'),
    body('email').isEmail().withMessage('Debe ser un correo electrónico válido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validate
];

const loginValidation = [
    body('email').isEmail().withMessage('Debe ser un correo electrónico válido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    validate
];

const recuperarContrasenaValidation = [
    body('email').isEmail().withMessage('Debe ser un correo electrónico válido').normalizeEmail(),
    body('cedula').notEmpty().withMessage('La cédula es obligatoria para verificar identidad'),
    body('nuevaPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
    validate
];

const actualizarPerfilValidation = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('apellido').notEmpty().withMessage('El apellido es obligatorio').trim(),
    validate
];

module.exports = {
    registrarUsuarioValidation,
    loginValidation,
    recuperarContrasenaValidation,
    actualizarPerfilValidation
};
