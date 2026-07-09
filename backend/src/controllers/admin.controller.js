const adminService = require('../services/admin.service');

const obtenerUsuarios = async (req, res, next) => {
    try {
        const usuarios = await adminService.obtenerUsuariosService();
        res.status(200).json(usuarios);
    } catch (error) {
        next(error);
    }
};

const cambiarRolUsuario = async (req, res, next) => {
    try {
        const { rol_id } = req.body;
        const usuario = await adminService.cambiarRolUsuarioService(req.params.id, rol_id);
        res.status(200).json({ message: 'Rol actualizado exitosamente', usuario });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const cambiarEstadoUsuario = async (req, res, next) => {
    try {
        const { estado } = req.body;
        const usuario = await adminService.cambiarEstadoUsuarioService(req.params.id, estado);
        res.status(200).json({ message: 'Estado actualizado exitosamente', usuario });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const obtenerTicketsGlobales = async (req, res, next) => {
    try {
        const tickets = await adminService.obtenerTicketsGlobalesService();
        res.status(200).json(tickets);
    } catch (error) {
        next(error);
    }
};

const tomarTicket = async (req, res, next) => {
    try {
        const ticket = await adminService.tomarTicketService(req.params.id, req.usuarioId, req.usuarioCategoria);
        res.status(200).json({ message: 'Ticket tomado exitosamente', ticket });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

const resolverTicket = async (req, res, next) => {
    try {
        await adminService.resolverTicketService(req.params.id, req.usuarioCategoria);
        res.status(200).json({ message: 'Ticket enviado a confirmación exitosamente' });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        next(error);
    }
};

module.exports = {
    obtenerUsuarios,
    cambiarRolUsuario,
    cambiarEstadoUsuario,
    obtenerTicketsGlobales,
    tomarTicket,
    resolverTicket
};
