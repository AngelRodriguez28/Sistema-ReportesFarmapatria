import { Component, OnInit, signal } from '@angular/core'; // 1. Importamos OnInit y signal
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
export class LoginLoginComponent implements OnInit {
  credenciales = {
    email: '',
    password: ''
  };

  // Estados UI
  mostrarBienvenida = signal(false);
  nombreUsuario = signal('');
  
  // Estados MFA
  requiereMFA = signal(false);
  esPrimeraVezMFA = signal(false);
  qrCodeUrl = signal('');
  codigoMFA = '';
  tokenTemporal = '';

  constructor(private router: Router, private authService: AuthService) {}

  // 3. RADAR DE SEGURIDAD PARA EL BUG 4 (Bloqueo de retroceso)
  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const usuarioGuardado = localStorage.getItem('usuarioLogueado');
      console.log('ngOnInit: detectada sesión activa?', !!usuarioGuardado);
      
      // Si el navegador detecta una sesión activa al intentar abrir la pantalla de Login
      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        const rolUsuario = Number(usuario.rol_id);
        
        console.log('ngOnInit: redirigiendo de inmediato al panel por sesión activa...');
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
        console.log("iniciarSesion: respuesta del backend recibida con éxito");
        
        // Si el backend pide MFA
        if (data.mfaRequired) {
          this.requiereMFA.set(true);
          this.esPrimeraVezMFA.set(data.mfaSetup);
          this.tokenTemporal = data.tokenTemp;

          // Si es la primera vez, cargar el QR Code
          if (data.mfaSetup) {
            this.authService.setupMFA(this.tokenTemporal).subscribe({
              next: (mfaData) => {
                this.qrCodeUrl.set(mfaData.qr_code);
              },
              error: (err) => alert("Error generando código QR para MFA.")
            });
          }
          return; // Detener flujo normal, esperar ingreso de código
        }

        this.procesarLoginExitoso(data);
      },
      error: (err) => {
        console.error("Error al conectar con el servidor:", err);
        const msj = err.error && err.error.error ? err.error.error : "Error de conexión. ¿Está encendido el Backend?";
        alert("Error al iniciar sesión: " + msj);
      }
    });
  }

  verificarMFA() {
    if (!this.codigoMFA) return alert("Por favor ingresa el código MFA.");
    
    this.authService.verifyMFA(this.tokenTemporal, this.codigoMFA).subscribe({
      next: (data) => {
        this.requiereMFA.set(false); // Ocultar modal
        this.procesarLoginExitoso(data);
      },
      error: (err) => {
        alert(err.error?.error || "Código MFA incorrecto.");
      }
    });
  }

  private procesarLoginExitoso(data: any) {
    if (data.usuario.avatar) {
      const timestamp = new Date().getTime();
      data.usuario.avatarUrl = `${environment.serverUrl}/${data.usuario.avatar.replace(/\\/g, '/')}?t=${timestamp}`;
    }
    localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
    localStorage.setItem('authToken', data.token);
    
    this.nombreUsuario.set(data.usuario.nombre);
    this.mostrarBienvenida.set(true);

    const rolUsuario = Number(data.usuario.rol_id);
    setTimeout(() => {
      if ([1, 3, 4, 5].includes(rolUsuario)) {
        this.router.navigate(['/panel-admin'], { replaceUrl: true }); 
      } else {
        this.router.navigate(['/panel-usuario'], { replaceUrl: true }); 
      }
    }, 3000);
  }
}