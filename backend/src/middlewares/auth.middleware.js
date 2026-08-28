const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'farmapatria_super_secret_key_2026';

const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Falta el token de autenticación.' });
    
    // El token debe venir como "Bearer <token>"
    const bearerToken = token.split(' ')[1] || token;

    jwt.verify(bearerToken, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido o expirado.' });
        req.usuarioId = decoded.id;
        req.usuarioRol = decoded.rol_id;
        req.usuarioCategoria = decoded.rol_categoria;
        req.mfaVerificado = decoded.mfa_verified || false;
        next();
    });
};

const esSuperAdmin = (req, res, next) => {
    if (Number(req.usuarioRol) !== 1) {
        return res.status(403).json({ error: 'Acceso Denegado. Solo el Súper Administrador (ROOT) puede realizar esta acción.' });
    }
    if (!req.mfaVerificado) {
        return res.status(403).json({ error: 'Acceso Denegado. Autenticación Multifactor (MFA) requerida para perfil ROOT.' });
    }
    next();
};

module.exports = {
    verificarToken,
    esSuperAdmin,
    SECRET_KEY
};
