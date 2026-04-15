import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.usuario.avatarUrl = e.target.result; // Convierte imagen a Base64 para maqueta
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor, selecciona un formato de imagen válido (JPG, PNG, GIF).');
    }
  }

  // B9-FIX: guardarCambios ahora persiste los datos en el backend real
  async guardarCambios() {
    if (!this.usuario.nombre || !this.usuario.apellido) {
      alert('Nombre y Apellido son obligatorios.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/usuarios/${this.usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: this.usuario.nombre, apellido: this.usuario.apellido })
      });
      const data = await response.json();
      if (response.ok) {
        // Actualizar localStorage con datos frescos del servidor
        const usuarioActualizado = { ...this.usuario, ...data.usuario };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioActualizado));
        this.usuario = usuarioActualizado;
        this.actualizarInicial();
        alert('Cambios guardados con éxito.');
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
