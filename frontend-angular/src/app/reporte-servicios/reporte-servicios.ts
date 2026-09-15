import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jsPDF } from 'jspdf';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-reporte-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-servicios.html',
  styleUrl: './reporte-servicios.css'
})
export class ReporteServicios implements OnInit {
  usuarioActual: any;
  reportesServicios: any[] = [];
  vistaActual: 'listar' | 'grid' | 'pre-form' | 'form' = 'grid'; // <-- Updated states

  // New properties for Flash Cards
  proveedores = [
    { id: 'cantv', nombre: 'CANTV', color: 'bg-blue-600', text: 'text-white', subservicios: ['PAGO TELEFÓNICA', 'PAGO ABA', 'PAGO ABA ULTRA', 'REPORTE FALLA MASIVA'] },
    { id: 'corpoelec', nombre: 'CORPOELEC', color: 'bg-yellow-500', text: 'text-white', subservicios: ['FALLA ELÉCTRICA', 'FASE CAÍDA', 'VARIACIÓN DE VOLTAJE'] },
    { id: 'hidrologica', nombre: 'Hidrológica', color: 'bg-blue-400', text: 'text-white', subservicios: ['SIN SUMINISTRO', 'BOTE DE AGUA'] },
    { id: 'inter', nombre: 'Inter', color: 'bg-blue-800', text: 'text-white', subservicios: ['SIN INTERNET', 'LENTITUD', 'CAÍDA INTERMITENTE'] },
    { id: 'movistar', nombre: 'Movistar', color: 'bg-green-500', text: 'text-white', subservicios: ['SIN SEÑAL', 'SIN DATOS', 'FALLA EN LÍNEA'] },
    { id: 'digitel', nombre: 'Digitel', color: 'bg-red-600', text: 'text-white', subservicios: ['SIN SEÑAL', 'SIN DATOS', 'FALLA EN LÍNEA'] },
    { id: 'otros', nombre: 'Otros', color: 'bg-gray-700', text: 'text-white', subservicios: ['Mantenimiento equipos', 'Seguridad', 'Limpieza', 'Otros'] }
  ];

  proveedorSeleccionado: any = null;
  subservicioSeleccionado: string = '';

  nuevoReporte = {
    tipo_servicio: '',
    proveedor: '',
    tiempo_sin_servicio: '',
    descripcion: ''
  };
  archivoSeleccionado: File | null = null;
  enviando = false;

  get opcionesServicio() {
    return [
      'Internet', 'Electricidad', 'Agua', 'Telefonía fija/móvil', 'Seguridad y vigilancia', 'Mantenimiento de equipos críticos', 'Otros servicios esenciales'
    ];
  }

  seleccionarProveedor(prov: any) {
    this.proveedorSeleccionado = prov;
    this.subservicioSeleccionado = ''; // reset select
    this.vistaActual = 'pre-form';
  }

  continuarAFormulario() {
    if (!this.subservicioSeleccionado) {
      alert('Por favor selecciona un tipo de servicio para continuar.');
      return;
    }
    this.nuevoReporte.proveedor = this.proveedorSeleccionado.nombre;
    this.nuevoReporte.tipo_servicio = this.subservicioSeleccionado;
    this.vistaActual = 'form';
  }

  irAListar() {
    this.vistaActual = 'listar';
  }

  volverAGrid() {
    this.vistaActual = 'grid';
  }

  volverAPreForm() {
    this.vistaActual = 'pre-form';
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usrStr = localStorage.getItem('usuarioLogueado');
      if (usrStr) {
        this.usuarioActual = JSON.parse(usrStr);
        this.cargarMisServicios();
      }
    }
  }

  cargarMisServicios() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    this.http.get<any[]>(`${environment.serverUrl}/api/servicios/usuario/${this.usuarioActual?.id}`, { headers })
      .subscribe({
        next: (res) => this.reportesServicios = res,
        error: (err) => console.error('Error cargando reportes de servicios', err)
      });
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.archivoSeleccionado = event.target.files[0];
    }
  }

  serverUrl = environment.serverUrl;

  generarPDF(reporte: any): Promise<void> {
    return new Promise((resolve) => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const img = new Image();
      img.src = '/cintillo.png';

      const construirDocumento = (tieneMembrete: boolean = true) => {
        if (tieneMembrete) {
          try {
            doc.addImage(img, 'PNG', 10, 10, 190, 30);
          } catch (e) {
            try {
              doc.addImage(img, 'JPEG', 10, 10, 190, 30);
            } catch (e2) {
              console.warn("Aviso: No se pudo renderizar la imagen del membrete.", e2);
            }
          }
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 86, 179);
        doc.text('REPORTE DE FALLA DE SERVICIOS', 105, 55, { align: 'center' });

        doc.setDrawColor(0, 86, 179);
        doc.setLineWidth(1);
        doc.line(15, 60, 195, 60);

        doc.setFillColor(255, 235, 238);
        doc.roundedRect(135, 65, 60, 25, 3, 3, 'F');

        doc.setFontSize(11);
        doc.setTextColor(183, 28, 28);
        doc.text('CÓDIGO DE REPORTE', 165, 73, { align: 'center' });
        doc.setFontSize(14);
        doc.text(reporte.numero_reporte || 'S/N', 165, 83, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        let y = 70;

        const drawField = (label: string, value: string) => {
          if (!value) return;
          doc.setFont("helvetica", "bold");
          doc.text(label, 15, y);
          doc.setFont("helvetica", "normal");
          const splitValue = doc.splitTextToSize(value, 95);
          doc.text(splitValue, 65, y);
          y += (splitValue.length * 7);
        };

        const fechaStr = reporte.fecha_creacion ? new Date(reporte.fecha_creacion).toLocaleString('es-VE') : new Date().toLocaleString('es-VE');
        drawField('Fecha de Registro:', fechaStr);
        drawField('Proveedor:', reporte.proveedor || 'N/A');
        drawField('Tipo de Servicio:', reporte.tipo_servicio || 'N/A');
        drawField('Tiempo sin Servicio:', reporte.tiempo_sin_servicio || 'No especificado');
        
        const solicitante = `${this.usuarioActual?.nombre || ''} ${this.usuarioActual?.apellido || ''}`.trim();
        if (solicitante) drawField('Solicitante:', solicitante);
        if (this.usuarioActual?.farmacia) drawField('Farmacia / Unidad:', this.usuarioActual.farmacia);
        if (this.usuarioActual?.gerencia) drawField('Gerencia:', this.usuarioActual.gerencia);
        drawField('Estado Actual:', reporte.estado || 'Pendiente');

        y += 5;
        doc.setFont("helvetica", "bold");
        doc.text('Descripción Detallada:', 15, y);

        y += 5;
        doc.setFillColor(245, 245, 245);
        const descLines = doc.splitTextToSize(reporte.descripcion || 'Sin descripción proporcionada.', 175);
        const rectHeight = (descLines.length * 6) + 10;
        doc.roundedRect(15, y, 180, rectHeight, 2, 2, 'F');

        doc.setFont("helvetica", "normal");
        doc.text(descLines, 20, y + 8);

        doc.setFontSize(9);
        doc.setTextColor(158, 158, 158);
        doc.text('Documento generado por la Plataforma de Gestión - Farmapatria', 105, 285, { align: 'center' });

        try {
          doc.save(`Reporte_${reporte.numero_reporte || 'Servicio'}.pdf`);
        } catch (saveErr) {
          console.error("Error al descargar PDF:", saveErr);
        }
        resolve();
      };

      img.onload = () => construirDocumento(true);
      img.onerror = () => {
        console.warn("Aviso: Membrete cintillo.png no disponible. Generando reporte estándar.");
        construirDocumento(false);
      };
    });
  }

  descargarPDF(reporte: any) {
    this.generarPDF(reporte);
  }

  enviarReporte() {
    if (!this.nuevoReporte.tipo_servicio) {
      alert('Por favor selecciona un tipo de servicio.');
      return;
    }

    this.enviando = true;
    const formData = new FormData();
    formData.append('usuario_id', this.usuarioActual?.id || '');
    formData.append('tipo_servicio', this.nuevoReporte.tipo_servicio);
    formData.append('proveedor', this.nuevoReporte.proveedor);
    formData.append('tiempo_sin_servicio', this.nuevoReporte.tiempo_sin_servicio);
    formData.append('descripcion', this.nuevoReporte.descripcion);
    if (this.archivoSeleccionado) {
      formData.append('archivo_adjunto', this.archivoSeleccionado);
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;

    this.http.post<any>(`${environment.serverUrl}/api/servicios`, formData, { headers })
      .subscribe({
        next: async (res) => {
          const numReporte = res.reporte?.numero_reporte || '';
          alert(`¡Éxito! Su reporte de servicio ha sido generado bajo el código: ${numReporte}`);
          
          if (res.reporte) {
            try {
              await this.generarPDF(res.reporte);
            } catch (pdfErr) {
              console.error('Error generando soporte PDF:', pdfErr);
            }
          }

          this.enviando = false;
          this.vistaActual = 'listar';
          this.nuevoReporte = { tipo_servicio: '', proveedor: '', tiempo_sin_servicio: '', descripcion: '' };
          this.archivoSeleccionado = null;
          this.cargarMisServicios();
        },
        error: (err) => {
          console.error(err);
          let msg = 'Error al enviar el reporte.';
          if (err.error?.error) msg = err.error.error;
          alert(msg);
          this.enviando = false;
        }
      });
  }
}
