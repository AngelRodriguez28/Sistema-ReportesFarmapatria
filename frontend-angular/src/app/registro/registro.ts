import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  
  // Objeto estructurado exactamente como lo espera tu Backend
  nuevoUsuario = {
    nombre: '',
    apellido: '',
    cedula: '',
    fecha_nac: '',
    estado: 'Activo', // Por defecto todos nacen activos
    gerencia: '',
    farmacia: '',
    email: '',
    password: '',
    confirmarPassword: '' // Campo temporal solo para validar
  };

  constructor(private router: Router, private authService: AuthService) {}

  // Fecha máxima permitida: hoy (no se permiten fechas futuras)
  get fechaMaxima(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  registrarse() {
    if (this.nuevoUsuario.password !== this.nuevoUsuario.confirmarPassword) {
      alert('Las contraseñas no coinciden. Por favor, verifica.');
      return;
    }

    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.cedula || !this.nuevoUsuario.gerencia || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      alert('Por favor, completa todos los campos obligatorios (*).');
      return;
    }

    const { confirmarPassword, ...datosParaEnviar } = this.nuevoUsuario;
    
    this.authService.registro(datosParaEnviar).subscribe({
      next: () => {
        alert('¡Registro exitoso! Ya puedes iniciar sesión en la plataforma.');
        this.router.navigate(['/login']); 
      },
      error: (err) => {
        console.error('Error al registrar:', err);
        const msj = err.error && err.error.error ? err.error.error : 'Verifica tus datos o conexión al servidor.';
        alert('Error al registrar: ' + msj);
      }
    });
  }
}