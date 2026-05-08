import { Component, OnInit } from '@angular/core'; // 1. Importamos OnInit
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

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

  iniciarSesion() {
    console.log("Intentando iniciar sesión con:", this.credenciales);

    this.authService.login(this.credenciales).subscribe({
      next: (data) => {
        if (data.usuario.avatar) {
          const timestamp = new Date().getTime();
          data.usuario.avatarUrl = `${environment.serverUrl}/${data.usuario.avatar.replace(/\\/g, '/')}?t=${timestamp}`;
        }
        localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
        localStorage.setItem('authToken', data.token); // BUG-C3 FIX: Guardar el JWT
        alert('¡Bienvenido a Farmapatria, ' + data.usuario.nombre + '!');
        
        const rolUsuario = Number(data.usuario.rol_id);

        if ([1, 3, 4, 5].includes(rolUsuario)) {
          this.router.navigate(['/panel-admin'], { replaceUrl: true }); 
        } else {
          this.router.navigate(['/panel-usuario'], { replaceUrl: true }); 
        }
      },
      error: (err) => {
        console.error("Error al conectar con el servidor:", err);
        const msj = err.error && err.error.error ? err.error.error : "Error de conexión. ¿Está encendido el Backend?";
        alert("Error al iniciar sesión: " + msj);
      }
    });
  }
}