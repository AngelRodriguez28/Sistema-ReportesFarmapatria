import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment'; // B1-FIX

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

  constructor(private router: Router) {}

  async cambiarContrasena() {
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

    try {
      const response = await fetch(`${environment.apiUrl}/recuperar-contrasena`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.datos.email,
          cedula: this.datos.cedula,
          nuevaPassword: this.datos.nuevaPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Contraseña actualizada exitosamente. Por favor, inicia sesión con tu nueva contraseña.');
        this.router.navigate(['/login']);
      } else {
        alert(data.error || 'Error al actualizar la contraseña.');
      }
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      alert('Error de conexión. ¿Está encendido el Backend en el puerto 3000?');
    } finally {
      this.cargando = false;
    }
  }
}
