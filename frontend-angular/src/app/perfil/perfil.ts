import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

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

      const formData = new FormData();
      formData.append('avatar', file);

      this.authService.subirAvatar(this.usuario.id, formData).subscribe({
        next: (data) => {
          const timestamp = new Date().getTime();
          const nuevaUrl = `${environment.serverUrl}/${data.avatarUrl.replace(/\\/g, '/')}?t=${timestamp}`;
          this.usuario.avatarUrl = nuevaUrl;
          this.usuario.avatar = data.avatarUrl; 
          localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));
        },
        error: (err) => {
          console.error('Error subiendo avatar:', err);
          const msj = err.error && err.error.error ? err.error.error : 'Verifica el tamaño o formato.';
          alert('Error al subir avatar: ' + msj);
        }
      });
    } else {
      alert('Por favor, selecciona un formato de imagen válido (JPG, PNG, GIF).');
    }
  }

  guardarCambios() {
    if (!this.usuario.nombre || !this.usuario.apellido) {
      alert('Nombre y Apellido son obligatorios.');
      return;
    }
    
    const fecha_nac = this.usuario.fecha_nac || this.usuario.fecha_nacimiento;
    
    this.authService.actualizarPerfil(this.usuario.id, {
      nombre: this.usuario.nombre, 
      apellido: this.usuario.apellido,
      fecha_nac: fecha_nac
    }).subscribe({
      next: (data) => {
        const usrServer = data.usuario;
        if (usrServer.avatar) {
          const timestamp = new Date().getTime();
          usrServer.avatarUrl = `${environment.serverUrl}/${usrServer.avatar.replace(/\\/g, '/')}?t=${timestamp}`;
        }
        usrServer.fecha_nac = usrServer.fecha_nacimiento || usrServer.fecha_nac;
        
        const usuarioActualizado = { ...this.usuario, ...usrServer };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioActualizado));
        this.usuario = usuarioActualizado;
        this.actualizarInicial();
        alert('Cambios guardados con éxito.');
        this.regresar();
      },
      error: (err) => {
        console.error('Error al guardar perfil:', err);
        const msj = err.error && err.error.error ? err.error.error : 'Intenta de nuevo.';
        alert('Error al guardar: ' + msj);
      }
    });
  }

  regresar() {
    // Si la categoría permite acceder al panel administrativo
    const categoriasAdmin = ['Control del Sistema', 'Soporte', 'Monitoreo'];
    if (categoriasAdmin.includes(this.usuario.rol_categoria)) {
      this.router.navigate(['/panel-admin']); 
    } else {
      this.router.navigate(['/panel-usuario']);
    }
  }
}
