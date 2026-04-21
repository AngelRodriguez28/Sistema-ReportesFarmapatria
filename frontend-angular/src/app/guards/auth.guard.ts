import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  if (typeof window !== 'undefined' && localStorage) {
    const token = localStorage.getItem('authToken');
    if (token) {
      return true; // Usuario autenticado
    }
  }

  // Redirigir al login si no tiene token
  router.navigate(['/login']);
  return false;
};
