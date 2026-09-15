const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Rutas base: /api/servicios

router.post('/', verificarToken, upload.single('archivo_adjunto'), serviciosController.crearReporte);
router.get('/usuario/:id', verificarToken, serviciosController.obtenerPorUsuario);
router.get('/', verificarToken, serviciosController.listarTodos);
router.put('/:id/tomar', verificarToken, serviciosController.tomarReporte);
router.put('/:id/resolver', verificarToken, serviciosController.resolverReporte);

module.exports = router;
