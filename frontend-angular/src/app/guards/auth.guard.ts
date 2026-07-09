import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Si se está ejecutando en el servidor (SSR), se aprueba la ruta para evitar
  // redirecciones falsas. La validación real ocurrirá en el cliente al hidratar la página.
  if (typeof window === 'undefined') {
    return true;
  }
  
  if (localStorage) {
    const token = localStorage.getItem('authToken');
    if (token) {
      return true; // Usuario autenticado
    }
  }

  // Redirigir al login si no tiene token
  router.navigate(['/login']);
  return false;
};
