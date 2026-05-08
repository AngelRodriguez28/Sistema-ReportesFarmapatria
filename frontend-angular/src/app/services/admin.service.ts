import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ticket } from '../core/models/ticket.interface';
import { Usuario } from '../core/models/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private adminUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // Gestión de Usuarios
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.adminUrl}/usuarios`);
  }

  cambiarRolUsuario(id: number, rolId: number): Observable<any> {
    return this.http.put<any>(`${this.adminUrl}/usuarios/${id}/rol`, { rol_id: rolId });
  }

  cambiarEstadoUsuario(id: number, estado: string): Observable<any> {
    return this.http.put<any>(`${this.adminUrl}/usuarios/${id}/estado`, { estado });
  }

  // Gestión de Tickets
  obtenerTicketsGlobales(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.adminUrl}/tickets`);
  }

  tomarTicket(id: number): Observable<any> {
    return this.http.put<any>(`${this.adminUrl}/tickets/${id}/tomar`, {});
  }

  resolverTicket(id: number): Observable<any> {
    return this.http.put<any>(`${this.adminUrl}/tickets/${id}/resolver`, {});
  }
}
