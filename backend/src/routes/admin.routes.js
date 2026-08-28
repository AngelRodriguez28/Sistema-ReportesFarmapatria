const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verificarToken, esSuperAdmin } = require('../middlewares/auth.middleware');
const { auditRootAction } = require('../middlewares/audit.middleware');

// Usuarios Globales (Soporte y Admin)
router.get('/usuarios', verificarToken, adminController.obtenerUsuarios);

// Solo Súper Admin
router.put('/usuarios/:id/rol', verificarToken, esSuperAdmin, auditRootAction, adminController.cambiarRolUsuario);
router.put('/usuarios/:id/estado', verificarToken, esSuperAdmin, auditRootAction, adminController.cambiarEstadoUsuario);

// Tickets Globales (Soporte y Admin)
router.get('/tickets', verificarToken, adminController.obtenerTicketsGlobales);
router.put('/tickets/:id/tomar', verificarToken, auditRootAction, adminController.tomarTicket);
router.put('/tickets/:id/resolver', verificarToken, auditRootAction, adminController.resolverTicket);

module.exports = router;
