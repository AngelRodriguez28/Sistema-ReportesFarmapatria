const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('../config/db');

const registrarUsuario = async (req, res, next) => {
    try {
        const userId = await authService.registrarUsuarioService(req.body);
        res.status(201).json({ message: 'Usuario registrado con éxito', userId });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'La cédula o correo ya existen.' });
        next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const usuario = await authService.loginService(email, password);
        const { password: _, ...usuarioSinPassword } = usuario;

        // Si es ROOT (rol_id 1), iniciar flujo MFA
        if (Number(usuario.rol_id) === 1) {
            // Consultar datos de MFA directos de la BD (si no están en el objeto usuario)
            const result = await pool.query('SELECT mfa_habilitado FROM usuarios WHERE id = $1', [usuario.id]);
            const mfaHabilitado = result.rows[0].mfa_habilitado;

            // Generar token temporal que solo sirva para completar el MFA
            const tokenTemp = jwt.sign(
                { id: usuario.id, rol_id: usuario.rol_id, mfa_pending: true }, 
                SECRET_KEY, 
                { expiresIn: '15m' }
            );

            return res.status(200).json({ 
                message: 'Autenticación parcial exitosa. Se requiere MFA.', 
                mfaRequired: true,
                mfaSetup: !mfaHabilitado, // Si es falso, debe configurar el QR
                tokenTemp
            });
        }

        // Login normal para otros usuarios
        const token = jwt.sign(
            { id: usuario.id, rol_id: usuario.rol_id, rol_categoria: usuario.rol_categoria, mfa_verified: false }, 
            SECRET_KEY, 
            { expiresIn: '8h' }
        );

        res.status(200).json({ message: 'Login exitoso', usuario: usuarioSinPassword, token });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const setupMFA = async (req, res, next) => {
    try {
        // req.usuarioId debe venir del token temporal
        if (Number(req.usuarioRol) !== 1) return res.status(403).json({ error: 'Solo ROOT puede configurar MFA.' });

        const result = await pool.query('SELECT mfa_secret FROM usuarios WHERE id = $1', [req.usuarioId]);
        const user = result.rows[0];

        let secret;
        if (user && user.mfa_secret) {
            // Reutilizar el secreto que ya se generó para no invalidar el QR anterior
            secret = {
                base32: user.mfa_secret,
                otpauth_url: speakeasy.otpauthURL({ secret: user.mfa_secret, label: 'SIGSO Farmapatria (ROOT)', encoding: 'base32' })
            };
        } else {
            // Generar uno nuevo solo si no existe
            secret = speakeasy.generateSecret({ name: 'SIGSO Farmapatria (ROOT)' });
            await pool.query('UPDATE usuarios SET mfa_secret = $1 WHERE id = $2', [secret.base32, req.usuarioId]);
        }

        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) throw err;
            res.status(200).json({ secret: secret.base32, qr_code: data_url });
        });
    } catch (error) {
        next(error);
    }
};

const verifyMFA = async (req, res, next) => {
    try {
        const { token, mfaCode } = req.body;
        
        // Decodificar token temporal (ya se asume que pasó un middleware previo o se decodifica manual)
        const decoded = jwt.verify(token, SECRET_KEY);
        if (!decoded.mfa_pending || Number(decoded.rol_id) !== 1) {
            return res.status(401).json({ error: 'Token temporal inválido.' });
        }

        const result = await pool.query(`
            SELECT u.*, r.nombre as rol_nombre, r.categoria as rol_categoria
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.id = $1
        `, [decoded.id]);
        const user = result.rows[0];

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: mfaCode,
            window: 1 // Permite un margen de error de +/- 30 segundos
        });

        if (verified) {
            // Marcar como habilitado si era su primera vez
            if (!user.mfa_habilitado) {
                await pool.query('UPDATE usuarios SET mfa_habilitado = true WHERE id = $1', [user.id]);
            }

            // Generar JWT definitivo con claim mfa_verified = true
            const tokenDefinitivo = jwt.sign(
                { id: user.id, rol_id: user.rol_id, rol_categoria: user.rol_categoria, mfa_verified: true }, 
                SECRET_KEY, 
                { expiresIn: '8h' }
            );

            const { password: _, ...usuarioSinPassword } = user;
            return res.status(200).json({ message: 'MFA exitoso. Sesión iniciada.', usuario: usuarioSinPassword, token: tokenDefinitivo });
        } else {
            return res.status(401).json({ error: 'Código MFA incorrecto.' });
        }
    } catch (error) {
        next(error);
    }
};

const recuperarContrasena = async (req, res, next) => {
    const { email, cedula, nuevaPassword } = req.body;
    try {
        await authService.recuperarContrasenaService(email, cedula, nuevaPassword);
        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

// Actualizar Perfil de Usuario
const actualizarPerfil = async (req, res, next) => {
    try {
        const usuario = await authService.actualizarPerfilService(req.params.id, req.body);
        res.status(200).json({ message: 'Perfil actualizado exitosamente.', usuario });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

// Subir Avatar
const subirAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo o tipo no permitido.' });
        }
        const avatarUrl = `uploads/${req.file.filename}`;
        
        await authService.subirAvatarService(req.params.id, avatarUrl);
        res.status(200).json({ message: 'Avatar actualizado exitosamente', avatarUrl });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registrarUsuario,
    login,
    setupMFA,
    verifyMFA,
    recuperarContrasena,
    actualizarPerfil,
    subirAvatar
};
