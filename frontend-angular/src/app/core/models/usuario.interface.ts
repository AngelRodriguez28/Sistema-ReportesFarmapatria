export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;
  fecha_nacimiento?: string;
  estado?: string;
  gerencia?: string;
  farmacia?: string;
  email: string;
  password?: string;
  rol_id?: number;
  avatar?: string;
}
