import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && localStorage) {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      
      // Validamos estrictamente por el ID del Rol
      // 1 = Root Administrador, 3 = GTIC, 4 = Redes, 5 = Aplicaciones
      if (usuario.rol_id === 1 || usuario.rol_id === 3 || usuario.rol_id === 4 || usuario.rol_id === 5) {
        return true; // ¡Acceso concedido al panel de administración!
      } else {
        // Es un Usuario o Cargo Estándar (rol_id = 2). Lo mandamos a su panel.
        router.navigate(['/panel-usuario']);
        return false; // ¡Acceso denegado!
      }
    }
  }

  // Si no hay sesión iniciada en absoluto, lo mandamos al login
  router.navigate(['/login']);
  return false;
};