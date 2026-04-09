import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private ticketActualizado = new BehaviorSubject<boolean>(false);
  
  ticketActualizado$ = this.ticketActualizado.asObservable();

  notificarNuevoTicket() {
    this.ticketActualizado.next(true);
  }
}
