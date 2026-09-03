import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Si se está ejecutando en el servidor (SSR), se aprueba la ruta para evitar
  // redirecciones falsas. La validación real ocurrirá en el cliente al hidratar la página.
  if (typeof window === 'undefined') {
    return true;
  }

  if (localStorage) {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      
      // Validamos por la categoría del rol en lugar de IDs fijos
      // Control del Sistema, Soporte y Monitoreo (Gerente de Tecnología) acceden al panel
      const categoriasPermitidas = ['Control del Sistema', 'Soporte', 'Monitoreo', 'Gerencia De Tecnologia'];
      if (categoriasPermitidas.includes(usuario.rol_categoria)) {
        return true; // ¡Acceso concedido!
      } else {
        // Rol estándar (Jefe de Farmacia, etc.). Lo redirige a su panel.
        router.navigate(['/panel-usuario']);
        return false; // ¡Acceso denegado!
      }
    }
  }

  // Si no hay sesión iniciada en absoluto, lo mandamos al login
  router.navigate(['/login']);
  return false;
};