import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// Importamos el cliente HTTP nativo con soporte para Fetch e Interceptores
import { provideHttpClient, withFetch, withInterceptors, HttpInterceptorFn } from '@angular/common/http'; 

// BUG-C3 FIX: Interceptor global para inyectar JWT en todas las consultas HTTP
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof window !== 'undefined' && localStorage ? localStorage.getItem('authToken') : null;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])) // Inyectamos el interceptor
  ]
};
