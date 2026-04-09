import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { TicketService } from '../services/ticket';

@Component({
  selector: 'app-generar-reporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './generar-reporte.html',
  styleUrl: './generar-reporte.css'
})
export class GenerarReporte implements OnInit {
  
  usuarioActual: any = null;
  
  constructor(private router: Router, private ticketService: TicketService) {}  // Inyectamos el Router y el TicketService

  // Esta función lee quién inició sesión apenas abre la pantalla
  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      if (usuarioGuardado) {
        this.usuarioActual = JSON.parse(usuarioGuardado);
      } else {
        // Si no hay nadie logueado, lo mandamos al login
        this.router.navigate(['/login']);
      }
    }
  }

  nuevoReporte = {
    fecha: new Date().toISOString().split('T')[0],
    nivelReporte: '',
    tipificacionFalla: '',
    anydesk: '',
    unidadReporta: '',
    unidadAfectada: '',
    contacto: '',
    descripcion: '',
    archivoAdjunto: null as File | null
  };

  nivelesReporte = [
    'Soporte Técnico',
    'Redes',
    'Aplicaciones',
    'Gestión Administrativa GTIC',
    'Opcional'
  ];

  tipificaciones = [
    '1. Soporte de Hardware (Instalación - Configuración - Dispositivos)',
    '2. Sustitución de Equipo-Traslado de Equipo-Desincorporación de Equipo',
    '3. Conectividad de Redes-(Punto de Red - Cableado - Punto de Dato)',
    '4. Soporte de Software-(Instalación - Configuración - Aplicativo )',
    '5. Respaldo de Datos-(Usuarios / Equipo / Bases de Datos)',
    '6. SAINT-Despacho no encontrado-(Procedencia de Sefa)',
    '7. SAINT-Traslado no encontrado-(Traslado entre Farmacia )',
    '8. SAINT-Lotes Duplicados',
    '9. SAINT-Precio Distinto a Sede Panteón',
    '10. SAINT-Ajuste en el Inventario en FP',
    '11. SAINT-Perfil y Acceso',
    '12. SAINT-Traslado entre Depósito',
    '13. SAINT-Instalación-Configuración-Conexión',
    '14. SAINT-Annual POS-(Configuración - Facturación)',
    '15. SICM-Perfil y Acceso',
    '16. SICM-Código de FP',
    '17. SICM-Error en Guia de FP',
    '18. SICM-Recepción de Correo FP',
    '19. SICM-Creación de Correo FP',
    '20. SIGESP-Perfil y Acceso',
    '21. SIGESP-Interacción de Módulos-(Principales, Administrativos, Auxiliares, Personal)',
    '22. SIGESP-Reproceso de Saldo',
    '23. SIGESP-Cierre Fiscal',
    '24. SIBO-Perfil y Acceso',
    '25. SIBO-Maestro de Usuario',
    '26. SIBO-Maestro de Producto',
    '27. SIBO- Instalación - Configuración - Conexión',
    '28. SIBO MPPS-Validar Servicio',
    '29. SIGA-Validar Servicio',
    '30. Capacitación e Inducción Técnica-(Relacionado con la Plataforma)',
    '31. Servicio de Internet',
    '32. Conectividad en la Red',
    '33. Opcional'
  ];

  unidadesQueReportan = [
    '1. ESTADAL AMAZONAS', '2. ESTADAL ANZOÁTEGUI', '3. ESTADAL APURE', '4. ESTADAL ARAGUA',
    '5. ESTADAL BARINAS', '6. ESTADAL BOLÍVAR', '7. ESTADAL CARABOBO', '8. ESTADAL COJEDES',
    '9. ESTADAL DELTA AMACURO', '10. ESTADAL DISTRITO CAPITAL', '11. ESTADAL FALCÓN', '12. ESTADAL GUÁRICO',
    '13. ESTADAL LA GUAIRA', '14. ESTADAL LARA', '15. ESTADAL MÉRIDA', '16. ESTADAL MIRANDA',
    '17. ESTADAL MONAGAS', '18. ESTADAL NUEVA ESPARTA', '19. ESTADAL PORTUGUESA', '20. ESTADAL SUCRE',
    '21. ESTADAL TÁCHIRA', '22. ESTADAL TRUJILLO', '23. ESTADAL YARACUY', '24. ESTADAL ZULIA',
    '25. PRESIDENCIA', '26. DIRECCIÓN DE DESPACHO', '27. DIRECCIÓN GENERAL', '28. GERENCIA GENERAL AUDITORIA INTERNA',
    '29. GERENCIA GENERAL ATENCIÓN CIUDADANA', '30. GERENCIA GENERAL DE GESTIÓN ADMINISTRATIVA', '31. CONSULTORÍA JURÍDICA',
    '32. GERENCIA GENERAL DE PLANIFICACIÓN, PRESUPUESTO Y ORGANIZACIÓN', '33. GERENCIA GENERAL DE GESTIÓN COMUNICACIONAL',
    '34. GERENCIA GENERAL DE GESTIÓN HUMANA', '35. GERENCIA GENERAL DE TECNOLOGÍA DE LA INFORMACIÓN', '36. GERENCIA GENERAL ESTRATEGÍA DE NEGOCIOS',
    '37. GERENCIA GENERAL DE SEGURIDAD INTEGRAL', '38. GERENCIA GENERAL DE COMERCIALIZACIÓN', '39. GERENCIA GENERAL DE ALMACENES Y LOGÍSTICA',
    '40. GERENCIA GENERAL DE VENTAS', '41. GERENCIA GENERAL GESTIÓN COMERCIAL', '42. GERENCIA GENERAL DE PROGRAMA DE SALUD',
    '43. GERENCIA GENERAL DE SISTEMA INTEGRAL DE CONTROL DE MEDICAMENTOS (SICM)', '44. GERENCIA GENERAL PARA LA INVESTIGACIÓN Y DESARROLLO DE PRODUCTOS NATURALES'
  ];

  unidadesAfectadas = [
    '1. FP122 LA GUACAMAYA', '2. FP264 BOLIPUERTO', '3. FP75 HOSPITAL LUIS RAZETTI', '4. FP69 HOSPITAL EL TIGRE',
    '5. FP709 MINHVI', '6. FP149 POLICIA DE SOTILLO', '7. FP750 MERCAL OROPERZA', '8. FP33 HOSPITAL PABLO A ORTIZ (HPAO)',
    '9. FP726 CAGUA', '10. FP616 DR. RUBEN AGUIRRE (CAMATAGUA)', '11. FP253 JESUS OCTAVIO MORAO', '12. FP76 CIUDAD TAVACARE BARINAS',
    '13. FP528 CRUZ PAREDES', '14. FP152 DOMINGA PAEZ ORTIZ (PEDRAZA)', '15. FP114 HOSP. BARINITAS (II)', '16. FP602 VIRGEN DE LA PAZ',
    '17. FP43 CENTRO SOCIALISTA SABANETA', '18. FP746 MERCAL JUAN PABLO II', '19. FP557 BATALLA DE LOS AZULES', '20. FP686 BOLÍVAR RENACE',
    '21. FP23 LOS SAMANES', '22. FP533 YO AMO UPATA', '23. FP90 CORPOELEC VALENCIA', '24. FP42 INDUSTRIAS DIANA',
    '25. FP712 MORON', '26. FP164 VENVIDRIO LOS GUAYOS', '27. FP147 POLICIA COJEDES', '28. FP53 TINACO',
    '29. FP52 TINAQUILLO HOSPITAL', '30. FP64 TINAQUILLO PDVAL', '31. FP722 IBIJI AJOINOKO', '32. FP171 IBIJI',
    '33. Fp154 HEROES DE LA PATRIA (MIPPCI)', '34. FP729 CARICUAO UD6', '35. FP118 MOVIL III', '36. FP165 MOVIL II',
    '37. FP711 EL ARAÑERO DE SABANETA', '38. FP406 DEFENSA PÚBLICA', '39. FP434 SEBIN', '40. FP440 INTI',
    '41. FP696 DR JOSÉ GREGORIO HERNÁNDEZ (FISCALIA)', '42. FP399 VIRGEN DEL VALLE (COMANDANCIA)', '43. FP672 MUSEO DR. JOSE GREGORIO HERNANDEZ (LA PASTORA)',
    '44. FP733 RUIZ PINEDA UD7', '45. FP400 ATLANTICO', '46. FP29 PERIFÉRICO DE COCHE', '47. FP4 SAN JOSÉ DE COTIZA',
    '48. FP251 CICPC', '49. FP747 MERCAL JARDINES DEL VALLE', '50. FP694 CIUDAD CARIBIA', '51. FP751 MERCAL AQUILES NAZOA',
    '52. FP690 GUARDIANES DE LA PATRIA', '53. FP233 MIRAFLORES (CERRADA*)', '54. FP718 MINPPAL', '55. FP760 MERCAL LOS MANGOS III',
    '56. FP742 MERCAL GRAVEUCA', '57. FP752 MERCAL LONGARAI', '58. FP365 PALMASOLA', '59. FP61 CAPATARIDA',
    '60. FP117 URUMACO', '61. FP736 LA GRAN COMUNA DEL SUR (DABAJURO)', '62. FP60 PROLONGACION', '63. FP124 ADICORA FALCON',
    '64. FP759 MERCAL SAN JOSE', '65. FP293 RIO TIZNADO', '66. FP104 HOSP.DR. FRANCISCO URDANETA', '67. FP103 JUAN ROSCIO NIEVES',
    '68. FP51 VALLE LA PASCUA', '69. FP728 ALFALLANO', '70. FP104 HOSPITAL DR.FRANCISCO URDANETA', '71. FP17 GUARACARUMBO',
    '72. FP714 TELÉFERICO', '73. FP678 VILLA MARINA LA GUAIRA', '74. FP515 LOS CISNES DUACA', '75. FP31 PORCINO DEL ALBA BARQUISIMETO',
    '76. FP32 LIBERTADOR', '77. FP72 CORE N°4 BARQUISIMETO', '78. FP71 BASE AEREA VICENTE LANDAETA GIL BARQUISIMETO', '79. FP723 CRISTOBAL PALAVECINO',
    '80. FP734 PEDRO CAMEJO II', '81. FP516 AMOR Y ESPERANZA', '82. FP170 ANTONIA ALBARRAN (LA AZULITA)', '83. FP79 SANTO DOMINGO',
    '84. FP275 CONATEL', '85. FP562 ALAS SOBERANAS', '86. FP545 S.E.N. (SECTOR ELECTRICO NACIONAL)', '87. FP756 MERCAL EJIDO',
    '88. FP505 JOSÉ GREGORIO HERNÁNDEZ (YARE)', '89. FP134 MAMPORAL', '90. FP708 IFE', '91. FP20 VTV',
    '92. FP738 HOSPITAL DE HIGUEROTE', '93. FP719 VICTORINO SANTAELLA', '94. FP563 GRAN MISIÓN TRANSPORTE', '95. FP710 UNEXCA',
    '96. FP25 JOSÉ TADEO MONAGAS', '97. FP41 CASINO MILITAR', '98. FP531 NUESTRA SEÑORA DEL VALLE (QUIRIQUIRE)', '99. FP677 POLIMONAGAS LA AVANZADORA',
    '100. FP48 CARIPITO', '101. FP24 PUNTA DE MATA', '102. FP93 FELICIA RONDÓN DE CABELLO', '103. FP713 DR.JOSÉ GREGORIO HERNÁNDEZ (ACARIGUA)',
    '104. FP157 VIRGEN DEL VALLE', '105. FP158 VIRGEN DE GUADALUPE', '106. FP730 VILLA JUANA', '107. FP139 JUANA LA AVANZADORA',
    '108. FP286 ACARIGUA', '109. FP534 SANTA ROSALIA', '110. FP129 OSPINO', '111. FP741 MERCAL OSPINO II',
    '112. FP146 CARUPANO', '113. FP717 PESCALBA', '114. FP126 RIBERO CARIACO', '115. FP753 MERCAL PLAYA GRANDE',
    '116. FP561 IRENE DE JESUS (CARDENAS)', '117. FP278 LA LOBATERA', '118. FP724 PLANTA TACHIRA', '119. FP727 SAN JOSÉ DE DELICIAS',
    '120. FP49 SAN CRISTOBAL BARRIO EL CARMEN', '121. FP754 MERCAL LA CONCORDIA', '122. FP169 FABRICIO OJEDA BOCONO', '123. FP725 BICENTENARIA CARVAJAL',
    '124. FP634 DR JOSÉ GREGORIO HERNÁNDEZ ISNOTÚ', '125. FP221 HOSPITAL JOSÉ VICENTE SCORZA', '126. FP684 CEMENTO ANDINO CANDELARIA', '127. FP123 FRANCISCO DE MIRANDA MOTATAN',
    '128. FP716 BICENTENARIA SABANA DE MENDOZA', '129. FP715 BICENTENARIA BETIJOQUE', '130. FP721 CRISTÓBAL MENDOZA BOMBEROS', '131. FP732 DR.PEDRO EMILIO CARRILLO',
    '132. FP731 VALLE DEL MOMBOY LA PUERTA', '133. FP151 BARBARITA DE LA TORRE PAMPANITO', '134. FP756 MERCAL EL MILAGRO', '135. FP155 HOSPITAL SAN FELIPE',
    '136. FP265 LA CAYENA', '137. FP739 FELIPE ROJAS', '138. FP740 MARIA GUIZZA AMBULATORIO CAMUNARE', '139. FP54 URACHICHE YARACUY',
    '140. FP335 BLASINA PEREZ (INTT)', '141. FP144 IPASME CABIMAS', '142. FP143 IPASME MARACAIBO', '143. FP115 FLOR PARRA MARACAIBO',
    '144. FP720 DOMITILA FLORES PUERTOS DE ALTAGRACIA', '145. FP749 MERCAL SAN JACINTO III', '146. GERENCIA DE CONTROL POSTERIOR', '147. GERENCIA DE DETERMINACIÓN DE RESPONSABILIDADES',
    '148. GERENCIA DE ADMINISTRACIÓN', '149. GERENCIA DE COMPRAS Y SUMINISTROS', '150. GERENCIA DE SERVICIOS GENERALES', '151. GERENCIA DE FINANZAS',
    '152. GERENCIA DE PLANIFICACIÓN', '153. GERENCIA DE PRESUPUESTO', '154. GERENCIA DE ORGANIZACIÓN Y SISTEMAS', '155. GERENCIA DE GESTIÓN DE PERSONAL',
    '156. GERENCIA DE BIENESTAR SOCIAL', '157. GERENCIA DE RECLUTAMIENTO Y SELECCIÓN', '158. GERENCIA DE FORMACIÓN Y DESARROLLO', '159. GERENCIA DE SISTEMAS DE INFORMACIÓN',
    '160. GERENCIA DE TELECOMUNICACIONES', '161. GERENCIA DE CONTROL ADMINISTRATIVO Y FINACIERO', '162. GERENCIA DE DISTRIBUCIÓN COMERCIAL', '163. GERENCIA DE VENTAS ATENCIÓN AL CLIENTE'
  ];

  capturarArchivo(event: any) {
    const archivo = event.target.files[0];
    if (archivo) {
      this.nuevoReporte.archivoAdjunto = archivo;
    }
  }

  generarPDF(numeroReporte: string) {
    const doc = new jsPDF('p', 'mm', 'a4'); 

    const img = new Image();
    img.src = '/cintillo.png'; // IMPORTANTE: Asegúrate de que cintillo.png esté en tu carpeta 'public'

    img.onload = () => {
      doc.addImage(img, 'PNG', 10, 10, 190, 30); 

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 86, 179); 
      doc.text('REPORTE DE INCIDENCIA TÉCNICA', 105, 55, { align: 'center' });

      doc.setDrawColor(0, 86, 179);
      doc.setLineWidth(1);
      doc.line(15, 60, 195, 60);

      doc.setFillColor(255, 235, 238); 
      doc.roundedRect(140, 65, 55, 25, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(183, 28, 28); 
      doc.text('CÓDIGO DE TICKET', 167.5, 73, { align: 'center' });
      doc.setFontSize(14);
      doc.text(numeroReporte, 167.5, 83, { align: 'center' });

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

      drawField('Fecha de Registro:', this.nuevoReporte.fecha);
      drawField('Número de Contacto:', this.nuevoReporte.contacto);
      drawField('Nivel de Reporte:', this.nuevoReporte.nivelReporte);
      drawField('Unidad que Reporta:', this.nuevoReporte.unidadReporta);
      drawField('Unidad Afectada:', this.nuevoReporte.unidadAfectada);
      drawField('Tipificación:', this.nuevoReporte.tipificacionFalla);
      drawField('N° Anydesk:', this.nuevoReporte.anydesk || 'N/A');

      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text('Descripción Detallada del Evento:', 15, y);
      
      y += 5;
      doc.setFillColor(245, 245, 245); 
      const descLines = doc.splitTextToSize(this.nuevoReporte.descripcion, 175);
      const rectHeight = (descLines.length * 6) + 10;
      doc.roundedRect(15, y, 180, rectHeight, 2, 2, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.text(descLines, 20, y + 8);

      doc.setFontSize(9);
      doc.setTextColor(158, 158, 158); 
      doc.text('Documento generado por la Plataforma de Gestión - Farmapatria', 105, 285, { align: 'center' });

      doc.save(`Ticket_${numeroReporte}.pdf`);
    };

    img.onerror = () => {
        alert("Aviso: No se encontró la imagen cintillo.png en la carpeta 'public'.");
        doc.text(`Ticket N°: ${numeroReporte}`, 10, 20);
        doc.save(`Ticket_${numeroReporte}.pdf`);
    }
  }

  async enviarReporte() {
    if (!this.nuevoReporte.nivelReporte) {
      alert("Error: Debe seleccionar un Nivel de Reporte obligatorio.");
      return;
    }

    const formData = new FormData();
    // Le inyectamos el ID real de tu usuario logueado
    formData.append('usuario_id', this.usuarioActual.id); 
    formData.append('contacto', this.nuevoReporte.contacto);
    formData.append('nivelReporte', this.nuevoReporte.nivelReporte);
    formData.append('tipificacionFalla', this.nuevoReporte.tipificacionFalla);
    formData.append('unidadReporta', this.nuevoReporte.unidadReporta);
    formData.append('unidadAfectada', this.nuevoReporte.unidadAfectada);
    formData.append('anydesk', this.nuevoReporte.anydesk);
    formData.append('descripcion', this.nuevoReporte.descripcion);

    if (this.nuevoReporte.archivoAdjunto) {
      formData.append('archivoAdjunto', this.nuevoReporte.archivoAdjunto);
    }

    try {
      const response = await fetch('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: formData 
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`¡Éxito! Su reporte ha sido generado bajo el código: ${resultado.ticket.numero_reporte}`);
        
        // Genera el PDF
        this.generarPDF(resultado.ticket.numero_reporte);

        // <-- Lanza la notificación para que el panel se actualice
        this.ticketService.notificarNuevoTicket(); 

        // Hace la redirección al panel principal automáticamente
        this.router.navigate(['/panel-usuario']);

      } else {
        alert("Ocurrió un error al intentar comunicar con el servidor de base de datos.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor.");
    }
  }
}