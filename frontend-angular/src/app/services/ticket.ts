import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ticket } from '../core/models/ticket.interface';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private ticketActualizado = new BehaviorSubject<boolean>(false);
  ticketActualizado$ = this.ticketActualizado.asObservable();
  
  private apiUrl = `${environment.apiUrl}/tickets`;
  private notificacionesUrl = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  notificarNuevoTicket() {
    this.ticketActualizado.next(true);
  }

  // Creación y Edición
  crearTicket(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  editarTicket(id: number, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData);
  }

  // Obtención
  obtenerTicketsPorUsuario(usuarioId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/${usuarioId}`);
  }

  // Acciones de Usuario
  reportarErrorPersistente(ticketId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${ticketId}/error-persistente`, {});
  }

  confirmarResolucion(ticketId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${ticketId}/confirmar`, {});
  }

  // Notificaciones
  obtenerNotificaciones(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.notificacionesUrl}/${usuarioId}`);
  }

  marcarNotificacionesLeidas(usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.notificacionesUrl}/marcar-leidas/${usuarioId}`, {});
  }
}
