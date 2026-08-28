const ROLES = {
    SUPER_ADMINISTRADOR: 1,      // Super Administrador
    JEFE_FARMACIA_ESTANDAR: 2,   // Jefe de Farmacia
    SOPORTE: 3,                  // Soporte Tecnico
    GERENTE_TECNOLOGIA: 4,       // Gerente General De Tecnologia
    SOPORTE_APLICACIONES: 5,     // Aplicaciones
    GERENTE_ESTADAL: 6,          // Gerente 1
    REDES: 7,                    // Redes
};

const CATEGORIAS_ROL = {
    ADMINISTRADOR: 'Control del Sistema',
    FARMACIA: 'Farmacia',
    SOPORTE: 'Soporte',
    MONITOREO: 'Monitoreo',
    GERENCIA: 'Gerencia De Tecnologia',
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
    CATEGORIAS_ROL,
    ESTADOS_USUARIO,
    ESTADOS_TICKET
};
