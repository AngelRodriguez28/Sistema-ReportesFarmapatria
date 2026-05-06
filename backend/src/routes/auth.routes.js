const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/registro', authController.registrarUsuario);
router.post('/login', authController.login);
router.put('/recuperar-contrasena', authController.recuperarContrasena);

// Perfil de Usuario
router.put('/usuarios/:id', verificarToken, authController.actualizarPerfil);
router.post('/usuarios/:id/avatar', verificarToken, upload.single('avatar'), authController.subirAvatar);

module.exports = router;
