import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment'; // B1-FIX

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  usuario: any = {
    id: 0,
    nombre: '',
    apellido: '',
    fecha_nac: '',
    avatarUrl: '',
    rol_id: 0
  };

  inicial = 'F';

  constructor(private router: Router) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      if (usuarioGuardado) {
        this.usuario = JSON.parse(usuarioGuardado);
        // Aseguramos que el input de fecha se llene si la BD devolvió fecha_nacimiento
        this.usuario.fecha_nac = this.usuario.fecha_nac || this.usuario.fecha_nacimiento;
        this.actualizarInicial();
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }

  actualizarInicial() {
    if (this.usuario.nombre) {
      this.inicial = this.usuario.nombre.substring(0, 1).toUpperCase();
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    
    if (!file) {
      return; // El usuario cerró la ventana de selección sin elegir ningún archivo
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.usuario.avatarUrl = e.target.result; // Convierte imagen a Base64 temporalmente
      };
      reader.readAsDataURL(file);

      // A3-FIX: Subir imagen directamente al backend
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const token = localStorage.getItem('authToken') || '';
        const response = await fetch(`${environment.apiUrl}/usuarios/${this.usuario.id}/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }, // BUG-C3 FIX
          body: formData
        });
        const data = await response.json();
        if (response.ok) {
          const timestamp = new Date().getTime();
          const nuevaUrl = `${environment.serverUrl}/${data.avatarUrl.replace(/\\/g, '/')}?t=${timestamp}`;
          this.usuario.avatarUrl = nuevaUrl;
          this.usuario.avatar = data.avatarUrl; // guardar también la ruta original
          // Limpiar el timestamp antes de guardar en localStorage si se prefiere, aunque tampoco afecta.
          localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));
        } else {
          alert('Error al subir avatar: ' + (data.error || 'Verifica el tamaño o formato.'));
        }
      } catch (error) {
        console.error('Error subiendo avatar:', error);
      }
    } else {
      alert('Por favor, selecciona un formato de imagen válido (JPG, PNG, GIF).');
    }
  }

  // B9-FIX + A4-FIX: guardarCambios ahora persiste fecha de nacimiento
  async guardarCambios() {
    if (!this.usuario.nombre || !this.usuario.apellido) {
      alert('Nombre y Apellido son obligatorios.');
      return;
    }
    try {
      // Renombramos la variable para mapear con backend
      const fecha_nac = this.usuario.fecha_nac || this.usuario.fecha_nacimiento;
      const token = localStorage.getItem('authToken') || '';
      const response = await fetch(`${environment.apiUrl}/usuarios/${this.usuario.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // BUG-C3 FIX
        },
        body: JSON.stringify({ 
          nombre: this.usuario.nombre, 
          apellido: this.usuario.apellido,
          fecha_nac: fecha_nac // A4-FIX
        })
      });
      const data = await response.json();
      if (response.ok) {
        // Actualizar localStorage con datos frescos del servidor
        // Mantenemos la estructura consistente
        const usrServer = data.usuario;
        if (usrServer.avatar) {
          const timestamp = new Date().getTime();
          usrServer.avatarUrl = `${environment.serverUrl}/${usrServer.avatar.replace(/\\/g, '/')}?t=${timestamp}`;
        }
        // Usar map de fecha
        usrServer.fecha_nac = usrServer.fecha_nacimiento || usrServer.fecha_nac;
        
        const usuarioActualizado = { ...this.usuario, ...usrServer };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioActualizado));
        this.usuario = usuarioActualizado;
        this.actualizarInicial();
        alert('Cambios guardados con éxito.');
        this.regresar();
      } else {
        alert('Error al guardar: ' + (data.error || 'Intenta de nuevo.'));
      }
    } catch (error) {
      console.error('Error de conexión al guardar perfil:', error);
      alert('Error de conexión. Verifica que el Backend esté corriendo.');
    }
  }

  regresar() {
    // Si el rol es admin o superadmin o de soporte GTIC
    if ([1, 3, 4, 5].includes(this.usuario.rol_id as number)) {
      this.router.navigate(['/panel-admin']); 
    } else {
      this.router.navigate(['/panel-usuario']);
    }
  }
}
