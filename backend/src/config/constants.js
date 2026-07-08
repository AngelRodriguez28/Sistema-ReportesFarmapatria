const ROLES = {
    SUPER_ADMINISTRADOR: 1,
    JEFE_FARMACIA_ESTANDAR: 2,
    ASISTENTE: 3,
    TECNICO: 4,
    ESPECIALISTA: 5,
    GERENTE_ESTADAL: 6,
    DESARROLLO: 7,
};

const ESTADOS_USUARIO = {
    ACTIVO: 'Activo',
    INACTIVO: 'Inactivo',
    BLOQUEADO: 'Bloqueado'
};

const ESTADOS_TICKET = {
    PENDIENTE: 'Pendiente',
    EN_PROGRESO: 'En Progreso',
    RESUELTO: 'Resuelto',
    SIN_CONFIRMAR: 'Sin Confirmar',
    CERRADO: 'Cerrado'
};

module.exports = {
    ROLES,
    ESTADOS_USUARIO,
    ESTADOS_TICKET
};
