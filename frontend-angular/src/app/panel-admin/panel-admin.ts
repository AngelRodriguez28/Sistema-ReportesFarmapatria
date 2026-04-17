import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { CommonModule } from '@angular/common'; 
import { jsPDF } from 'jspdf';
import { timer, Subscription } from 'rxjs'; 
import { environment } from '../../environments/environment'; // B1-FIX
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css'
})
export class PanelAdmin implements OnInit, OnDestroy { 
  
  adminActual = signal<any>({ id: 0, nombre: 'Cargando...', apellido: '', gerencia: '', rol_id: 0 });
  pestanaActual = signal<'tickets' | 'usuarios' | 'estadisticas'>('tickets');
  isSidebarOpen = signal<boolean>(true);
  
  // Variable de Estado para la Ventana Modal
  ticketSeleccionado = signal<any>(null); 
  
  todosLosUsuarios = signal<any[]>([]);
  todosLosTickets = signal<any[]>([]);
  terminoBusqueda = signal<string>('');

  ticketsFiltrados = computed(() => {
    const busqueda = this.terminoBusqueda().toLowerCase();
    if (!busqueda) return this.todosLosTickets();
    return this.todosLosTickets().filter(ticket => 
      ticket.numero_reporte?.toLowerCase().includes(busqueda) ||
      ticket.nombre?.toLowerCase().includes(busqueda) ||
      ticket.apellido?.toLowerCase().includes(busqueda) ||
      ticket.unidad_afectada?.toLowerCase().includes(busqueda) ||
      ticket.tipificacion_falla?.toLowerCase().includes(busqueda) ||
      ticket.estado_ticket?.toLowerCase().includes(busqueda)
    );
  });

  private motorDeTiempo: Subscription | undefined;
  graficoEstatus: any;
  graficoFallas: any;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      if (usuarioGuardado) {
        const admin = JSON.parse(usuarioGuardado);
        this.adminActual.set(admin);
        
        this.motorDeTiempo = timer(0, 30000).subscribe(() => { // BUG-M5: Polling menos agresivo
          this.cargarTodosLosTickets();
          if (admin.rol_id === 1) this.cargarTodosLosUsuarios();
        });
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }

  ngOnDestroy() {
    if (this.motorDeTiempo) this.motorDeTiempo.unsubscribe();
    if (this.graficoEstatus) this.graficoEstatus.destroy();
    if (this.graficoFallas) this.graficoFallas.destroy();
  }

  // ==========================================
  // LÓGICA DE LA VENTANA MODAL 
  // ==========================================
  abrirModalDetalle(ticket: any) {
    this.ticketSeleccionado.set(ticket);
  }

  cerrarModal() {
    this.ticketSeleccionado.set(null);
  }

  obtenerRutaImagen(ruta: string): string {
    if (!ruta) return '';
    const rutaLimpia = ruta.replace(/\\/g, '/');
    return `${environment.serverUrl}/${rutaLimpia}`;
  }
  // ==========================================

  actualizarBusqueda(event: any) {
    this.terminoBusqueda.set(event.target.value);
  }

  cambiarPestana(pestana: 'tickets' | 'usuarios' | 'estadisticas') {
    this.pestanaActual.set(pestana);
    if (pestana === 'estadisticas') {
      setTimeout(() => this.renderizarGraficosGlobales(), 100);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  irAlPerfil() {
    this.router.navigate(['/perfil']);
  }

  renderizarGraficosGlobales() {
    const canvasEstatus = document.getElementById('chartEstatusAdmin') as HTMLCanvasElement;
    const canvasFallas = document.getElementById('chartFallasAdmin') as HTMLCanvasElement;
    if (!canvasEstatus || !canvasFallas) return;

    const pendientes = this.todosLosTickets().filter(t => t.estado_ticket === 'Pendiente').length;
    const sinConfirmar = this.todosLosTickets().filter(t => t.estado_ticket === 'Sin Confirmar').length; // BUG-M2: Incluir Sin Confirmar
    const resueltos = this.todosLosTickets().filter(t => t.estado_ticket === 'Resuelto').length;

    if (this.graficoEstatus) this.graficoEstatus.destroy();
    this.graficoEstatus = new Chart(canvasEstatus, {
       type: 'bar',
       data: {
           labels: ['Pendientes', 'Sin Confirmar', 'Resueltos'],
           datasets: [{
               label: 'Volumen de Tickets',
               data: [pendientes, sinConfirmar, resueltos],
               backgroundColor: ['#A70336', '#FFC907', '#28a745'] // Colores que combinan con tickets
           }]
       },
       options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const conteo: any = {};
    this.todosLosTickets().forEach(t => {
      const falla = t.tipificacion_falla.length > 20 ? t.tipificacion_falla.substring(0, 20) + '...' : t.tipificacion_falla;
      conteo[falla] = (conteo[falla] || 0) + 1;
    });

    if (this.graficoFallas) this.graficoFallas.destroy();
    this.graficoFallas = new Chart(canvasFallas, {
        type: 'pie',
        data: {
           labels: Object.keys(conteo),
           datasets: [{
               data: Object.values(conteo),
               backgroundColor: ['#273376', '#A70336', '#FFC907', '#28a745', '#17a2b8', '#6c757d']
           }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { family: 'Georama' } } } } }
    });
  }

  cargarTodosLosTickets() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/tickets`).subscribe(tickets => {
        
        // ORDENAMIENTO: Del más reciente al más antiguo
        const ticketsOrdenados = tickets.sort((a, b) => {
            const fechaA = new Date(a.fecha_creacion).getTime();
            const fechaB = new Date(b.fecha_creacion).getTime();
            return fechaB - fechaA; 
        });

        this.todosLosTickets.set(ticketsOrdenados);
        
        if (this.pestanaActual() === 'estadisticas') {
            this.renderizarGraficosGlobales();
        }
    });
  }

  cargarTodosLosUsuarios() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/usuarios`).subscribe(usuarios => this.todosLosUsuarios.set(usuarios));
  }

  cambiarRolUsuario(usuario: any, event: any) {
    const nuevoRolId = event.target.value;
    const nombreRol = event.target.options[event.target.selectedIndex].text;

    if(confirm(`¿Estás seguro de cambiar el rol de ${usuario.nombre} a ${nombreRol}?`)) {
      // B5-FIX: Convertir a número (event.target.value siempre es string en HTML)
      this.http.put(`${environment.apiUrl}/admin/usuarios/${usuario.id}/rol`, { rol_id: Number(nuevoRolId) })
        .subscribe(() => {
          alert('Rol actualizado exitosamente');
          this.cargarTodosLosUsuarios();
        });
    } else {
      event.target.value = usuario.rol_id;
    }
  }

  cambiarEstadoUsuario(usuario: any) {
    const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const accion = nuevoEstado === 'Inactivo' ? 'BLOQUEAR' : 'DESBLOQUEAR';

    if(confirm(`¿Estás seguro de ${accion} a ${usuario.nombre} ${usuario.apellido}?`)) {
      this.http.put(`${environment.apiUrl}/admin/usuarios/${usuario.id}/estado`, { estado: nuevoEstado })
        .subscribe(() => {
          this.cargarTodosLosUsuarios();
        });
    }
  }

  marcarComoResuelto(ticket: any) {
    if(confirm(`¿Estás seguro de marcar el ticket ${ticket.numero_reporte} como RESUELTO?`)) {
      this.http.put(`${environment.apiUrl}/admin/tickets/${ticket.id}/resolver`, {})
        .subscribe(() => this.cargarTodosLosTickets());
    }
  }

  cerrarSesion() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem('usuarioLogueado');
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  descargarPDF(ticket: any) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const fechaFormateada = new Date(ticket.fecha_creacion).toLocaleDateString();

    const imgCintillo = new Image();
    imgCintillo.src = '/cintillo.png';

    const construirDocumento = (imgEvidencia: HTMLImageElement | null = null, tieneMembrete: boolean = true) => {
        if (tieneMembrete) {
            try {
                doc.addImage(imgCintillo, 'PNG', 10, 10, 190, 30); 
            } catch (e) {
                console.warn('No se pudo añadir el cintillo.');
            }
        }
        
        doc.setFont("helvetica", "bold");
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
            doc.setFont("helvetica", "bold");
            doc.text(label, 15, y);
            doc.setFont("helvetica", "normal");
            const splitValue = doc.splitTextToSize(value, 100); 
            doc.text(splitValue, 60, y);
            y += (splitValue.length * 7); 
        };

        drawField('Fecha de Registro:', fechaFormateada);
        drawField('Número de Contacto:', ticket.numero_contacto);
        drawField('Nivel de Reporte:', ticket.nivel_reporte);
        drawField('Usuario Emisor:', `${ticket.nombre} ${ticket.apellido}`);
        drawField('Unidad que Reporta:', ticket.unidad_reporta);
        drawField('Unidad Afectada:', ticket.unidad_afectada);
        drawField('Tipificación:', ticket.tipificacion_falla);
        drawField('N° Anydesk:', ticket.anydesk || 'N/A');

        y += 5;
        doc.setFont("helvetica", "bold");
        doc.text('Descripción Detallada del Evento:', 15, y);
        
        y += 5;
        doc.setFillColor(245, 245, 245); 
        const descLines = doc.splitTextToSize(ticket.descripcion || 'Sin descripción detallada.', 175);
        const rectHeight = (descLines.length * 6) + 10;
        doc.roundedRect(15, y, 180, rectHeight, 2, 2, 'F');
        
        doc.setFont("helvetica", "normal");
        doc.text(descLines, 20, y + 8);

        y += rectHeight + 10;

        if (imgEvidencia) {
            doc.setFont("helvetica", "bold");
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
            imgEvidencia.crossOrigin = "Anonymous";
            imgEvidencia.src = this.obtenerRutaImagen(ticket.archivo_adjunto);

            imgEvidencia.onload = () => construirDocumento(imgEvidencia, tieneMembrete);
            
            imgEvidencia.onerror = () => {
                alert('Atención: El archivo de evidencia física se extravió en el servidor. Generando PDF sin foto.');
                construirDocumento(null, tieneMembrete);
            };
        } else {
            construirDocumento(null, tieneMembrete); 
        }
    };

    imgCintillo.onload = () => resolverEvidenciaYConstruir(true);

    imgCintillo.onerror = () => {
        console.warn('Aviso: No se pudo acceder al membrete oficial (cintillo.png). Documento generado modo soporte.');
        resolverEvidenciaYConstruir(false);
    };
  }
}