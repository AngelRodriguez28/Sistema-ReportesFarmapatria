const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { 
    generarTicketValidation, 
    editarTicketValidation 
} = require('../middlewares/validations/tickets.validation');

// Rutas de Tickets
router.post('/tickets', verificarToken, upload.fields([{ name: 'archivoAdjunto', maxCount: 1 }, { name: 'imagenAnydesk', maxCount: 1 }]), generarTicketValidation, ticketsController.generarTicket);
router.get('/tickets/:usuarioId', verificarToken, ticketsController.obtenerTicketsUsuario);
router.put('/tickets/:id', verificarToken, upload.fields([{ name: 'archivoAdjunto', maxCount: 1 }, { name: 'imagenAnydesk', maxCount: 1 }]), editarTicketValidation, ticketsController.editarTicket);
router.put('/tickets/:id/confirmar', verificarToken, ticketsController.confirmarResolucion);
router.put('/tickets/:id/error-persistente', verificarToken, ticketsController.reportarErrorPersistente);

// Rutas de Notificaciones
router.get('/notificaciones/:usuarioId', verificarToken, ticketsController.obtenerNotificaciones);
router.put('/notificaciones/marcar-leidas/:usuarioId', verificarToken, ticketsController.marcarNotificacionesLeidas);

module.exports = router;
