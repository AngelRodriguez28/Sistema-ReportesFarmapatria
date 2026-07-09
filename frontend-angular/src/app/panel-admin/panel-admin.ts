import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { jsPDF } from 'jspdf';
import { timer, Subscription } from 'rxjs'; 
import { environment } from '../../environments/environment'; // B1-FIX
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css'
})
export class PanelAdmin implements OnInit, OnDestroy { 
  
  adminActual = signal<any>({ id: 0, nombre: 'Cargando...', apellido: '', gerencia: '', rol_id: 0, rol_categoria: '' });
  pestanaActual = signal<'home' | 'tickets' | 'usuarios' | 'estadisticas'>('home');
  isSidebarOpen = signal<boolean>(false);
  habilitarTransicion = false;
  
  // Variable de Estado para la Ventana Modal
  ticketSeleccionado = signal<any>(null); 
  
  todosLosUsuarios = signal<any[]>([]);
  todosLosTickets = signal<any[]>([]);
  terminoBusqueda = signal<string>('');
  terminoBusquedaUsuario = signal<string>('');

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

  usuariosFiltrados = computed(() => {
    const busqueda = this.terminoBusquedaUsuario().toLowerCase();
    const usuarios = this.todosLosUsuarios();
    if (!busqueda) return usuarios;
    return usuarios.filter(user => 
      user.nombre?.toLowerCase().includes(busqueda) ||
      user.apellido?.toLowerCase().includes(busqueda) ||
      user.email?.toLowerCase().includes(busqueda) ||
      user.cedula?.toLowerCase().includes(busqueda) ||
      user.gerencia?.toLowerCase().includes(busqueda)
    );
  });

  usuariosPendientesCount = computed(() => 
    this.todosLosUsuarios().filter(user => user.estado === 'Inactivo').length
  );

  // KPIs Calculados para el Home
  totalTickets = computed(() => {
    const rolCategoria = this.adminActual().rol_categoria;
    if (rolCategoria === 'Soporte') {
      return this.todosLosTickets().filter(t => t.tecnico_id === this.adminActual().id).length;
    }
    return this.todosLosTickets().length;
  });

  totalPendientes = computed(() => {
    const rolCategoria = this.adminActual().rol_categoria;
    if (rolCategoria === 'Soporte') {
      return this.todosLosTickets().filter(t => t.tecnico_id === this.adminActual().id && t.estado_ticket === 'En Progreso').length;
    }
    return this.todosLosTickets().filter(t => t.estado_ticket === 'Pendiente' || t.estado_ticket === 'En Progreso').length;
  });

  ticketsGlobalesNuevos = computed(() => this.todosLosTickets().filter(t => t.estado_ticket === 'Pendiente').length);

  totalSinConfirmar = computed(() => this.todosLosTickets().filter(t => t.estado_ticket === 'Sin Confirmar').length);

  totalResueltos = computed(() => {
    const rolCategoria = this.adminActual().rol_categoria;
    if (rolCategoria === 'Soporte') {
      return this.todosLosTickets().filter(t => t.tecnico_id === this.adminActual().id && (t.estado_ticket === 'Resuelto' || t.estado_ticket === 'Sin Confirmar')).length;
    }
    return this.todosLosTickets().filter(t => t.estado_ticket === 'Resuelto').length;
  });

  totalUsuarios = computed(() => this.todosLosUsuarios().length);

  // Rendimiento de Técnicos (Vista Súper Admin y Monitoreo)
  estadisticasTecnicos = computed(() => {
    // Filtrar solo usuarios con categoría de soporte
    const tecnicos = this.todosLosUsuarios().filter(u => u.rol_categoria === 'Soporte');
    const tickets = this.todosLosTickets();

    return tecnicos.map(tecnico => {
      const ticketsDelTecnico = tickets.filter(t => t.tecnico_id === tecnico.id);
      const asignados = ticketsDelTecnico.length;
      const resueltos = ticketsDelTecnico.filter(t => t.estado_ticket === 'Resuelto' || t.estado_ticket === 'Sin Confirmar').length;
      const enProgreso = ticketsDelTecnico.filter(t => t.estado_ticket === 'En Progreso').length;
      const eficiencia = asignados === 0 ? 0 : Math.round((resueltos / asignados) * 100);

      // Determinar color de rol para UI (Soporte GTIC es ID 3, Soporte Aplicaciones es ID 5)
      let colorRol = 'bg-blue-100 text-blue-700 border-blue-200';
      if (tecnico.rol_id === 5) colorRol = 'bg-purple-100 text-purple-700 border-purple-200';

      return {
        ...tecnico,
        estadisticas: { asignados, resueltos, enProgreso, eficiencia },
        colorRol
      };
    });
  });

  // Mi Eficiencia (Vista Técnico)
  miEficiencia = computed(() => {
    const rolCategoria = this.adminActual().rol_categoria;
    if (rolCategoria !== 'Soporte') return 0;

    const asignados = this.totalTickets();
    const resueltos = this.totalResueltos();
    
    if (asignados === 0) return 0;
    return Math.round((resueltos / asignados) * 100);
  });

  private motorDeTiempo: Subscription | undefined;
  graficoEstatus: any;
  graficoFallas: any;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      if (window.innerWidth >= 768) {
        this.isSidebarOpen.set(true);
      }
      setTimeout(() => {
        this.habilitarTransicion = true;
      }, 150);

      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      if (usuarioGuardado) {
        const admin = JSON.parse(usuarioGuardado);
        this.adminActual.set(admin);
        
        this.motorDeTiempo = timer(0, 30000).subscribe(() => { // BUG-M5: Polling menos agresivo
          this.cargarTodosLosTickets();
          if (admin.rol_categoria === 'Control del Sistema') this.cargarTodosLosUsuarios();
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

  cambiarPestana(pestana: 'home' | 'tickets' | 'usuarios' | 'estadisticas') {
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
    const enProgreso = this.todosLosTickets().filter(t => t.estado_ticket === 'En Progreso').length;
    const sinConfirmar = this.todosLosTickets().filter(t => t.estado_ticket === 'Sin Confirmar').length; // BUG-M2: Incluir Sin Confirmar
    const resueltos = this.todosLosTickets().filter(t => t.estado_ticket === 'Resuelto').length;

    if (this.graficoEstatus) this.graficoEstatus.destroy();
    this.graficoEstatus = new Chart(canvasEstatus, {
       type: 'bar',
       data: {
           labels: ['Pendientes', 'En Progreso', 'Sin Confirmar', 'Resueltos'],
           datasets: [{
               label: 'Volumen de Tickets',
               data: [pendientes, enProgreso, sinConfirmar, resueltos],
               backgroundColor: ['#A70336', '#17a2b8', '#FFC907', '#28a745'] // Colores que combinan con tickets
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
    this.adminService.obtenerTicketsGlobales().subscribe(tickets => {
        const rolCategoria = this.adminActual().rol_categoria;
        const adminId = this.adminActual().id;
        
        // ORDENAMIENTO: Del más reciente al más antiguo
        let ticketsOrdenados = tickets.sort((a, b) => {
            const fechaA = new Date(a.fecha_creacion || 0).getTime();
            const fechaB = new Date(b.fecha_creacion || 0).getTime();
            return fechaB - fechaA; 
        });

        // FILTRO POR CATEGORÍA: Soporte solo ve 'Pendientes' globales y sus propios tickets tomados/resueltos
        if (rolCategoria === 'Soporte') {
            ticketsOrdenados = ticketsOrdenados.filter(t => t.estado_ticket === 'Pendiente' || t.tecnico_id === adminId);
        }

        this.todosLosTickets.set(ticketsOrdenados);
        
        if (this.pestanaActual() === 'estadisticas') {
            this.renderizarGraficosGlobales();
        }
    });
  }

  cargarTodosLosUsuarios() {
    this.adminService.obtenerUsuarios().subscribe(usuarios => this.todosLosUsuarios.set(usuarios));
  }

  cambiarRolUsuario(usuario: any, event: any) {
    const nuevoRolId = event.target.value;
    const nombreRol = event.target.options[event.target.selectedIndex].text;

    if(confirm(`¿Estás seguro de cambiar el rol de ${usuario.nombre} a ${nombreRol}?`)) {
      // B5-FIX: Convertir a número (event.target.value siempre es string en HTML)
      this.adminService.cambiarRolUsuario(usuario.id, Number(nuevoRolId))
        .subscribe(() => {
          alert('Rol actualizado exitosamente');
          this.cargarTodosLosUsuarios();
        });
    } else {
      event.target.value = usuario.rol_id;
    }
  }

  cambiarEstadoUsuario(usuario: any, event: any) {
    const nuevoEstado = event.target.value;
    const accion = nuevoEstado === 'Inactivo' ? 'INACTIVAR y BLOQUEAR el acceso de' : 'ACTIVAR y PERMITIR el acceso de';

    if(confirm(`¿Estás seguro de ${accion} ${usuario.nombre} ${usuario.apellido}?`)) {
      this.adminService.cambiarEstadoUsuario(usuario.id, nuevoEstado)
        .subscribe(() => {
          this.cargarTodosLosUsuarios();
        });
    } else {
      // Revertir el cambio visual en el select si cancela
      event.target.value = usuario.estado === 'Bloqueado' ? 'Inactivo' : usuario.estado;
    }
  }

  actualizarBusquedaUsuario(event: any) {
    this.terminoBusquedaUsuario.set(event.target.value);
  }

  aprobarUsuarioRapido(usuario: any) {
    if (confirm(`¿Estás seguro de APROBAR y ACTIVAR la cuenta de ${usuario.nombre} ${usuario.apellido}?`)) {
      this.adminService.cambiarEstadoUsuario(usuario.id, 'Activo')
        .subscribe({
          next: () => {
            alert('Cuenta aprobada y activada exitosamente.');
            this.cargarTodosLosUsuarios();
          },
          error: (err) => {
            console.error('Error al aprobar usuario:', err);
            alert('Hubo un error al intentar aprobar la cuenta.');
          }
        });
    }
  }

  tomarTicket(ticket: any) {
    if (this.adminActual().rol_categoria !== 'Soporte') {
      alert('Acción no permitida: Solo los técnicos de soporte pueden tomar casos.');
      return;
    }
    if(confirm(`¿Estás seguro de tomar el ticket ${ticket.numero_reporte}? Pasará a estar "En Progreso".`)) {
      this.adminService.tomarTicket(ticket.id)
        .subscribe({
          next: () => this.cargarTodosLosTickets(),
          error: (err) => {
            console.error('Error al tomar ticket:', err);
            alert('Error al intentar tomar el ticket. Es posible que el backend no esté actualizado o falte la columna en la base de datos. Por favor, reinicia el servidor de Node (server.js).');
          }
        });
    }
  }

  marcarComoResuelto(ticket: any) {
    if (this.adminActual().rol_categoria !== 'Soporte') {
      alert('Acción no permitida: Solo los técnicos de soporte pueden resolver casos.');
      return;
    }
    if(confirm(`¿Estás seguro de marcar el ticket ${ticket.numero_reporte} como RESUELTO? (Se enviará a confirmación del usuario)`)) {
      this.adminService.resolverTicket(ticket.id)
        .subscribe({
          next: () => this.cargarTodosLosTickets(),
          error: (err) => {
            console.error('Error al resolver ticket:', err);
            alert('Hubo un error en el servidor al intentar resolver el ticket.');
          }
        });
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

  corregirTicket(ticket: any) {
    this.router.navigate(['/generar-reporte'], { state: { ticketAEditar: ticket } });
  }
}