import { Component, OnInit } from '@angular/core'; // 1. Importamos OnInit
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginLoginComponent implements OnInit { // 2. Implementamos OnInit en la clase
  credenciales = {
    email: '',
    password: ''
  };

  constructor(private router: Router) {}

  // 3. RADAR DE SEGURIDAD PARA EL BUG 4 (Bloqueo de retroceso)
  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      
      // Si el navegador detecta una sesión activa al intentar abrir la pantalla de Login
      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        const rolUsuario = Number(usuario.rol_id);
        
        // Lo redirige inmediatamente a su panel reemplazando el historial para evitar bucles
        if ([1, 3, 4, 5].includes(rolUsuario)) {
          this.router.navigate(['/panel-admin'], { replaceUrl: true });
        } else {
          this.router.navigate(['/panel-usuario'], { replaceUrl: true });
        }
      }
    }
  }

  async iniciarSesion() {
    console.log("Intentando iniciar sesión con:", this.credenciales);

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.credenciales)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
        alert('¡Bienvenido a Farmapatria, ' + data.usuario.nombre + '!');
        
        const rolUsuario = Number(data.usuario.rol_id);

        // 4. Redirección limpia manipulando el stack de navegación del navegador
        if ([1, 3, 4, 5].includes(rolUsuario)) {
          this.router.navigate(['/panel-admin'], { replaceUrl: true }); 
        } else {
          this.router.navigate(['/panel-usuario'], { replaceUrl: true }); 
        }
      } else {
        alert("Credenciales incorrectas: " + data.error);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      alert("Error de conexión. ¿Está encendido el Backend en el puerto 3000?");
    }
  }
}