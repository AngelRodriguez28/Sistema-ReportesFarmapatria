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

  guardarCambios() {
    if (!this.usuario.nombre || !this.usuario.apellido) {
      alert('Nombre y Apellido son obligatorios.');
      return;
    }
    // Guardar en maqueta frontend
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));
    }
    this.actualizarInicial();
    alert('Cambios guardados con éxito.');
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
