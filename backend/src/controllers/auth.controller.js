const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');

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
        
        const token = jwt.sign({ id: usuario.id, rol_id: usuario.rol_id }, SECRET_KEY, { expiresIn: '8h' });

        const { password: _, ...usuarioSinPassword } = usuario;
        res.status(200).json({ message: 'Login exitoso', usuario: usuarioSinPassword, token });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
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
    recuperarContrasena,
    actualizarPerfil,
    subirAvatar
};
