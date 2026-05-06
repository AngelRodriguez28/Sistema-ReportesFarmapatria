export interface Ticket {
  id?: number;
  numero_reporte?: string;
  usuario_id?: number;
  numero_contacto: string;
  nivel_reporte: string;
  tipificacion_falla: string;
  unidad_reporta: string;
  unidad_afectada: string;
  anydesk?: string;
  descripcion: string;
  archivo_adjunto?: string;
  imagen_anydesk?: string;
  estado_ticket?: string;
  fecha_creacion?: string;
  tecnico_id?: number;
  tecnico_nombre?: string;
  tecnico_apellido?: string;
  nombre?: string; // Nombre del usuario que reportó (para admin)
  apellido?: string; // Apellido del usuario que reportó (para admin)
  gerencia_usuario?: string;
}
