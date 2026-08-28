const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { 
    registrarUsuarioValidation, 
    loginValidation, 
    recuperarContrasenaValidation, 
    actualizarPerfilValidation 
} = require('../middlewares/validations/auth.validation');

router.post('/registro', registrarUsuarioValidation, authController.registrarUsuario);
router.post('/login', loginValidation, authController.login);
router.get('/login/mfa/setup', verificarToken, authController.setupMFA);
router.post('/login/mfa/verify', authController.verifyMFA);
router.put('/recuperar-contrasena', recuperarContrasenaValidation, authController.recuperarContrasena);

// Perfil de Usuario
router.put('/usuarios/:id', verificarToken, actualizarPerfilValidation, authController.actualizarPerfil);
router.post('/usuarios/:id/avatar', verificarToken, upload.single('avatar'), authController.subirAvatar);

module.exports = router;
