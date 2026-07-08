const ticketsService = require('../services/tickets.service');

const generarTicket = async (req, res, next) => {
    try {
        const archivoRuta = req.files && req.files['archivoAdjunto'] ? req.files['archivoAdjunto'][0].path : null;
        const imagenAnydeskRuta = req.files && req.files['imagenAnydesk'] ? req.files['imagenAnydesk'][0].path : null;

        const ticket = await ticketsService.generarTicketService(req.body, archivoRuta, imagenAnydeskRuta);
        res.status(201).json({ mensaje: "Ticket creado exitosamente", ticket });
    } catch (error) {
        next(error);
    }
};

const editarTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const archivoRuta = req.files && req.files['archivoAdjunto'] ? req.files['archivoAdjunto'][0].path : null;
        const imagenAnydeskRuta = req.files && req.files['imagenAnydesk'] ? req.files['imagenAnydesk'][0].path : null;

        const ticket = await ticketsService.editarTicketService(ticketId, req.body, archivoRuta, imagenAnydeskRuta);
        res.status(200).json({ message: 'Ticket actualizado exitosamente', ticket });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const obtenerTicketsUsuario = async (req, res, next) => {
    try {
        const tickets = await ticketsService.obtenerTicketsUsuarioService(req.params.usuarioId);
        res.status(200).json(tickets);
    } catch (error) {
        next(error);
    }
};

const confirmarResolucion = async (req, res, next) => {
    try {
        await ticketsService.confirmarResolucionService(req.params.id);
        res.status(200).json({ message: 'Requerimiento confirmado exitosamente' });
    } catch (error) {
        next(error);
    }
};

const reportarErrorPersistente = async (req, res, next) => {
    try {
        await ticketsService.reportarErrorPersistenteService(req.params.id);
        res.status(200).json({ message: 'Error persistente reportado exitosamente' });
    } catch (error) {
        next(error);
    }
};

const obtenerNotificaciones = async (req, res, next) => {
    try {
        const notificaciones = await ticketsService.obtenerNotificacionesService(req.params.usuarioId);
        res.status(200).json(notificaciones);
    } catch (error) {
        next(error);
    }
};

const marcarNotificacionesLeidas = async (req, res, next) => {
    try {
        await ticketsService.marcarNotificacionesLeidasService(req.params.usuarioId);
        res.status(200).json({ message: 'Notificaciones leídas' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generarTicket,
    editarTicket,
    obtenerTicketsUsuario,
    confirmarResolucion,
    reportarErrorPersistente,
    obtenerNotificaciones,
    marcarNotificacionesLeidas
};
