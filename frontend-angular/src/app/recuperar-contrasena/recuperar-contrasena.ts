import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.css'
})
export class RecuperarContrasena {
  datos = {
    email: '',
    cedula: '', // BUG-C1 FIX
    nuevaPassword: '',
    confirmarPassword: ''
  };

  cargando = false;

  constructor(private router: Router, private authService: AuthService) {}

  cambiarContrasena() {
    if (!this.datos.email || !this.datos.cedula || !this.datos.nuevaPassword || !this.datos.confirmarPassword) {
      alert('Por favor, completa todos los campos requeridos.');
      return;
    }

    if (this.datos.nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.datos.nuevaPassword !== this.datos.confirmarPassword) {
      alert('Las contraseñas no coinciden. Verifica tus datos.');
      return;
    }

    this.cargando = true;

    this.authService.recuperarContrasena({
      email: this.datos.email,
      cedula: this.datos.cedula,
      nuevaPassword: this.datos.nuevaPassword
    }).subscribe({
      next: () => {
        alert('Contraseña actualizada exitosamente. Por favor, inicia sesión con tu nueva contraseña.');
        this.router.navigate(['/login']);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al conectar con el servidor:', err);
        const msj = err.error && err.error.error ? err.error.error : 'Error al actualizar la contraseña.';
        alert(msj);
        this.cargando = false;
      }
    });
  }
}
