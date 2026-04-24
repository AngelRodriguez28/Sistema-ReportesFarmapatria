import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; 
import { TicketService } from '../services/ticket';
import { CommonModule } from '@angular/common'; 
import { jsPDF } from 'jspdf'; 
import { timer, Subscription } from 'rxjs'; 
import { environment } from '../../environments/environment'; // B1-FIX
// --- NUEVO: IMPORTAMOS CHART.JS ---
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-panel-usuario',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
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
  // B8-FIX: Guardar referencia a la suscripción del ticketService para poder cancelarla
  private ticketSub: Subscription | undefined;
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
        
        this.motorDeTiempo = timer(0, 30000).subscribe(() => { // M5-FIX
          this.cargarNotificaciones();
          this.cargarTickets();
        });

        // B8-FIX: Guardar la suscripción en variable
        this.ticketSub = this.ticketService.ticketActualizado$.subscribe(actualizado => {
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
    // B8-FIX: Cancelar suscripción al ticketService
    if (this.ticketSub) this.ticketSub.unsubscribe();
    if (this.graficoUsuario) this.graficoUsuario.destroy();
  }

  actualizarBusqueda(event: any) {
    this.terminoBusqueda.set(event.target.value);
  }

  cargarNotificaciones() {
    this.http.get<any[]>(`${environment.apiUrl}/notificaciones/${this.usuarioActual().id}`)
      .subscribe(data => this.notificaciones.set(data));
  }

  cargarTickets() {
    this.http.get<any[]>(`${environment.apiUrl}/tickets/${this.usuarioActual().id}`)
      .subscribe(todos => {
        this.misTickets.set(todos); 
        this.ticketsPendientes.set(todos.filter(t => t.estado_ticket === 'Pendiente' || t.estado_ticket === 'En Progreso'));
        this.ticketsSinConfirmar.set(todos.filter(t => t.estado_ticket === 'Sin Confirmar'));
        this.ticketsResueltos.set(todos.filter(t => t.estado_ticket === 'Resuelto'));
        
        // --- NUEVO: Renderizamos el gráfico con los datos frescos ---
        setTimeout(() => this.renderizarGrafico(), 100);
      });
  }

  // --- NUEVO: Lógica del Gráfico ---
  renderizarGrafico() {
    // BUG-M4: Removida restricción de Jefes de Farmacia para que puedan ver gráficas

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
      this.http.put(`${environment.apiUrl}/notificaciones/marcar-leidas/${this.usuarioActual().id}`, {})
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
    if (pestana === 'estatus') {
      setTimeout(() => this.renderizarGrafico(), 100);
    }
  }

  irAlPerfil() {
    this.router.navigate(['/perfil']);
  }

  // B3-FIX: Implementación completa del PDF para el Panel Usuario
  descargarPDF(ticket: any) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const fechaFormateada = new Date(ticket.fecha_creacion).toLocaleDateString('es-VE');
    const usuario = this.usuarioActual();

    const imgCintillo = new Image();
    imgCintillo.src = '/cintillo.png';

    const obtenerRutaImagen = (ruta: string): string => {
      if (!ruta) return '';
      return `${environment.serverUrl}/${ruta.replace(/\\/g, '/')}`;
    };

    const construirDocumento = (imgEvidencia: HTMLImageElement | null = null, tieneMembrete: boolean = true) => {
      if (tieneMembrete) {
        try {
          doc.addImage(imgCintillo, 'PNG', 10, 10, 190, 30);
        } catch (e) {
          console.warn('No se pudo añadir el cintillo.');
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(39, 51, 118);
      doc.text('REPORTE DE INCIDENCIA TÉCNICA', 105, 55, { align: 'center' });
      doc.setDrawColor(39, 51, 118);
      doc.setLineWidth(1);
      doc.line(15, 60, 195, 60);

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(140, 65, 55, 25, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setTextColor(167, 3, 54);
      doc.text('CÓDIGO DE TICKET', 167.5, 73, { align: 'center' });
      doc.setFontSize(14);
      doc.text(ticket.numero_reporte, 167.5, 83, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      let y = 70;

      const drawField = (label: string, value: string) => {
        if (!value || value === '') return;
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, y);
        doc.setFont('helvetica', 'normal');
        const splitValue = doc.splitTextToSize(value, 100);
        doc.text(splitValue, 60, y);
        y += (splitValue.length * 7);
      };

      drawField('Fecha de Registro:', fechaFormateada);
      drawField('Número de Contacto:', ticket.numero_contacto);
      drawField('Nivel de Reporte:', ticket.nivel_reporte);
      drawField('Usuario Emisor:', `${usuario.nombre} ${usuario.apellido}`);
      drawField('Unidad que Reporta:', ticket.unidad_reporta);
      drawField('Unidad Afectada:', ticket.unidad_afectada);
      drawField('Tipificación:', ticket.tipificacion_falla);
      drawField('N° Anydesk:', ticket.anydesk || 'N/A');

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Descripción Detallada del Evento:', 15, y);

      y += 5;
      doc.setFillColor(245, 245, 245);
      const descLines = doc.splitTextToSize(ticket.descripcion || 'Sin descripción detallada.', 175);
      const rectHeight = (descLines.length * 6) + 10;
      doc.roundedRect(15, y, 180, rectHeight, 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.text(descLines, 20, y + 8);

      y += rectHeight + 10;

      if (imgEvidencia) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(39, 51, 118);
        doc.text('EVIDENCIA FOTOGRÁFICA ADJUNTA:', 15, y);
        y += 6;

        const maxW = 180;
        const maxH = 100;
        const ratio = Math.min(maxW / imgEvidencia.width, maxH / imgEvidencia.height);
        const finalW = imgEvidencia.width * ratio;
        const finalH = imgEvidencia.height * ratio;

        let formato = 'JPEG';
        if (ticket.archivo_adjunto && ticket.archivo_adjunto.toLowerCase().endsWith('.png')) formato = 'PNG';

        try {
          doc.addImage(imgEvidencia, formato, 15, y, finalW, finalH);
        } catch (e) {
          console.warn('Error adjuntando evidencia', e);
        }
      }

      doc.setFontSize(9);
      doc.setTextColor(158, 158, 158);
      doc.text('Documento oficial recuperado de la Plataforma de Gestión - Farmapatria', 105, 285, { align: 'center' });

      doc.save(`${ticket.numero_reporte}.pdf`);
    };

    const resolverEvidenciaYConstruir = (tieneMembrete: boolean) => {
      if (ticket.archivo_adjunto) {
        const imgEvidencia = new Image();
        imgEvidencia.crossOrigin = 'Anonymous';
        imgEvidencia.src = obtenerRutaImagen(ticket.archivo_adjunto);
        imgEvidencia.onload = () => construirDocumento(imgEvidencia, tieneMembrete);
        imgEvidencia.onerror = () => {
          alert('Aviso: El archivo de evidencia no se encontró en el servidor. Generando PDF sin foto.');
          construirDocumento(null, tieneMembrete);
        };
      } else {
        construirDocumento(null, tieneMembrete);
      }
    };

    imgCintillo.onload = () => resolverEvidenciaYConstruir(true);
    imgCintillo.onerror = () => {
      console.warn('Aviso: No se encontró cintillo.png. Generando en modo soporte.');
      resolverEvidenciaYConstruir(false);
    };
  }

  corregirTicket(ticket: any) {
    this.router.navigate(['/generar-reporte'], { state: { ticketAEditar: ticket } });
  }

  confirmarRequerimiento(ticket: any) {
    if(confirm(`¿Estás seguro de confirmar la resolución del ticket ${ticket.numero_reporte}? Esto dará por cerrado el caso.`)) {
      this.http.put(`${environment.apiUrl}/tickets/${ticket.id}/confirmar`, {})
        .subscribe(() => {
          this.cargarTickets();
        });
    }
  }
}