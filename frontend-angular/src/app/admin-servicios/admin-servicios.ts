import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-servicios.html',
  styleUrl: './admin-servicios.css'
})
export class AdminServicios implements OnInit {
  usuarioActual: any;
  reportesServicios: any[] = [];
  filtroEstado = 'Todos';
  serverUrl = environment.serverUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usrStr = localStorage.getItem('usuarioLogueado');
      if (usrStr) {
        this.usuarioActual = JSON.parse(usrStr);
        this.cargarTodosServicios();
      }
    }
  }

  cargarTodosServicios() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    this.http.get<any[]>(`${environment.serverUrl}/api/servicios`, { headers })
      .subscribe({
        next: (res) => this.reportesServicios = res,
        error: (err) => console.error('Error cargando reportes de servicios globales', err)
      });
  }

  get reportesFiltrados() {
    if (this.filtroEstado === 'Todos') {
      return this.reportesServicios;
    }
    if (this.filtroEstado === 'Atendidos') {
      return this.reportesServicios.filter(r => r.estado === 'Resuelto' || r.estado === 'En Progreso');
    }
    return this.reportesServicios.filter(r => r.estado === this.filtroEstado);
  }

  esSoporte() {
    return this.usuarioActual?.rol_categoria === 'Soporte';
  }

  esGerente() {
    return this.usuarioActual?.rol_categoria === 'Gerente 1' || this.usuarioActual?.rol_categoria === 'Gerencia De Tecnologia' || this.usuarioActual?.rol_categoria === 'Gerente General De Tecnologia' || Number(this.usuarioActual?.rol_id) === 4;
  }

  puedeGestionar(reporte: any) {
    // Si está pendiente y el usuario es soporte o gerente, lo puede tomar
    if (reporte.estado === 'Pendiente' && (this.esSoporte() || this.esGerente())) {
      return true;
    }
    // Si está en progreso y el usuario actual lo tomó, lo puede resolver
    if (reporte.estado === 'En Progreso' && reporte.tecnico_id === this.usuarioActual.id) {
      return true;
    }
    return false;
  }

  tomarReporte(id: number) {
    if (!confirm('¿Seguro que deseas tomar este reporte?')) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    this.http.put(`${environment.serverUrl}/api/servicios/${id}/tomar`, { tecnico_id: this.usuarioActual.id }, { headers })
      .subscribe({
        next: () => {
          alert('Reporte tomado exitosamente');
          this.cargarTodosServicios();
        },
        error: (err) => {
          console.error(err);
          alert('Error al tomar el reporte');
        }
      });
  }

  resolverReporte(id: number) {
    if (!confirm('¿Seguro que deseas marcar este reporte como resuelto?')) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    this.http.put(`${environment.serverUrl}/api/servicios/${id}/resolver`, {}, { headers })
      .subscribe({
        next: () => {
          alert('Reporte resuelto exitosamente');
          this.cargarTodosServicios();
        },
        error: (err) => {
          console.error(err);
          alert('Error al resolver el reporte');
        }
      });
  }
}
