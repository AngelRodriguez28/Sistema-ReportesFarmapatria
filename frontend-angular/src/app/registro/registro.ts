import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 
import { CommonModule } from '@angular/common';

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

  constructor(private router: Router) {}

  async registrarse() {
    // Validaciones de seguridad en el Frontend
    if (this.nuevoUsuario.password !== this.nuevoUsuario.confirmarPassword) {
      alert('Las contraseñas no coinciden. Por favor, verifica.');
      return;
    }

    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.cedula || !this.nuevoUsuario.gerencia || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      alert('Por favor, completa todos los campos obligatorios (*).');
      return;
    }

    try {
      // Enviamos los datos a tu Backend en Node.js
      // B6-FIX: Excluir confirmarPassword del body (es solo validación frontend)
      const { confirmarPassword, ...datosParaEnviar } = this.nuevoUsuario;
      const response = await fetch('http://localhost:3000/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaEnviar)
      });

      const data = await response.json();

      if (response.ok) {
        alert('¡Registro exitoso! Ya puedes iniciar sesión en la plataforma.');
        this.router.navigate(['/login']); // Lo mandamos de vuelta al Login
      } else {
        alert('Error al registrar: ' + (data.error || 'Verifica tus datos.'));
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error al conectar con el servidor. Verifica que el Backend esté corriendo.');
    }
  }
}