import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { TicketService } from '../services/ticket';
import { CommonModule } from '@angular/common'; 
import { jsPDF } from 'jspdf'; 
import { timer, Subscription } from 'rxjs'; 
// --- NUEVO: IMPORTAMOS CHART.JS ---
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-panel-usuario',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './panel-usuario.html',
  styleUrl: './panel-usuario.css'
})
export class PanelUsuario implements OnInit, OnDestroy { 
  
  usuarioActual = signal<any>({ id: 0, nombre: 'Cargando...', apellido: '', gerencia: '', farmacia: '' });
  notificaciones = signal<any[]>([]);
  noLeidas = computed(() => this.notificaciones().filter(n => !n.leida).length); 
  mostrarMenuNotificaciones = signal<boolean>(false); 

  isSidebarOpen = signal<boolean>(true);
  inicial = computed(() => {
    const nombre = this.usuarioActual().nombre;
    return nombre ? nombre.substring(0,1).toUpperCase() : 'U';
  });

  // --- NUEVO: ROL LABORAL DINÁMICO ---
  cargoLaboral = computed(() => {
    const usr = this.usuarioActual();
    if (usr.farmacia && usr.farmacia.toUpperCase().includes('FP')) {
      return `Jefe de Farmacia`;
    }
    if (usr.gerencia && usr.gerencia.includes('ESTADAL')) {
      return 'Gerente Estadal';
    }
    return 'Analista / Especialista';
  });

  misTickets = signal<any[]>([]); 
  terminoBusqueda = signal<string>('');

  historialFiltrado = computed(() => {
    const busqueda = this.terminoBusqueda().toLowerCase();
    if (!busqueda) return this.misTickets();
    return this.misTickets().filter(ticket => 
      ticket.numero_reporte?.toLowerCase().includes(busqueda) ||
      ticket.tipificacion_falla?.toLowerCase().includes(busqueda) ||
      ticket.unidad_afectada?.toLowerCase().includes(busqueda) ||
      ticket.estado_ticket?.toLowerCase().includes(busqueda)
    );
  });

  pestanaActual = signal<'estatus' | 'historico'>('estatus');

  ticketsPendientes = signal<any[]>([]);
  ticketsSinConfirmar = signal<any[]>([]);
  ticketsResueltos = signal<any[]>([]);

  private motorDeTiempo: Subscription | undefined;
  graficoUsuario: any; // <-- Variable para guardar el gráfico

  constructor(
    private http: HttpClient, 
    private router: Router,
    private ticketService: TicketService
  ) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      if (usuarioGuardado) {
        this.usuarioActual.set(JSON.parse(usuarioGuardado));
        
        this.motorDeTiempo = timer(0, 5000).subscribe(() => {
          this.cargarNotificaciones();
          this.cargarTickets();
        });

        this.ticketService.ticketActualizado$.subscribe(actualizado => {
          if (actualizado) {
            this.cargarNotificaciones();
            this.cargarTickets();
          }
        });
      } else {
        this.router.navigate(['/login']);
      }
    }
  }

  ngOnDestroy() {
    if (this.motorDeTiempo) this.motorDeTiempo.unsubscribe();
    if (this.graficoUsuario) this.graficoUsuario.destroy();
  }

  actualizarBusqueda(event: any) {
    this.terminoBusqueda.set(event.target.value);
  }

  cargarNotificaciones() {
    this.http.get<any[]>(`http://localhost:3000/api/notificaciones/${this.usuarioActual().id}`)
      .subscribe(data => this.notificaciones.set(data));
  }

  cargarTickets() {
    this.http.get<any[]>(`http://localhost:3000/api/tickets/${this.usuarioActual().id}`)
      .subscribe(todos => {
        this.misTickets.set(todos); 
        this.ticketsPendientes.set(todos.filter(t => t.estado_ticket === 'Pendiente'));
        this.ticketsSinConfirmar.set(todos.filter(t => t.estado_ticket === 'Sin Confirmar'));
        this.ticketsResueltos.set(todos.filter(t => t.estado_ticket === 'Resuelto'));
        
        // --- NUEVO: Renderizamos el gráfico con los datos frescos ---
        setTimeout(() => this.renderizarGrafico(), 100);
      });
  }

  // --- NUEVO: Lógica del Gráfico ---
  renderizarGrafico() {
    if (this.usuarioActual().rol_id === 2) return; // Jefes de Farmacia no consumen recursos gráficos

    const canvas = document.getElementById('miGraficoFallas') as HTMLCanvasElement;
    if (!canvas) return;

    // Contamos cuántas veces ocurre cada falla
    const conteo: any = {};
    this.misTickets().forEach(t => {
      // Acortamos el texto para que quepa en el gráfico
      const falla = t.tipificacion_falla.length > 25 ? t.tipificacion_falla.substring(0, 25) + '...' : t.tipificacion_falla;
      conteo[falla] = (conteo[falla] || 0) + 1;
    });

    if (this.graficoUsuario) {
      this.graficoUsuario.data.labels = Object.keys(conteo);
      this.graficoUsuario.data.datasets[0].data = Object.values(conteo);
      this.graficoUsuario.update();
    } else {
      this.graficoUsuario = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: Object.keys(conteo),
          datasets: [{
            data: Object.values(conteo),
            backgroundColor: ['#273376', '#A70336', '#FFC907', '#28a745', '#17a2b8', '#6c757d'] // Paleta Oficial
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Georama' } } } }
        }
      });
    }
  }
  
  toggleCampanita() {
    this.mostrarMenuNotificaciones.set(!this.mostrarMenuNotificaciones());
    if (this.mostrarMenuNotificaciones() && this.noLeidas() > 0) {
      this.http.put(`http://localhost:3000/api/notificaciones/marcar-leidas/${this.usuarioActual().id}`, {})
        .subscribe(() => {
           this.notificaciones.update(notifs => notifs.map(n => ({ ...n, leida: true })));
        });
    }
  }

  cerrarSesion() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem('usuarioLogueado');
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  cambiarPestana(pestana: 'estatus' | 'historico') {
    this.pestanaActual.set(pestana);
  }

  irAlPerfil() {
    this.router.navigate(['/perfil']);
  }

  descargarPDF(ticket: any) { /* Tu código de PDF intacto */ }
}