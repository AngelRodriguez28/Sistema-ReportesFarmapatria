import { Routes } from '@angular/router';
import { LoginLoginComponent } from './login/login';
import { PanelUsuario } from './panel-usuario/panel-usuario';
import { GenerarReporte } from './generar-reporte/generar-reporte';
import { PanelAdmin } from './panel-admin/panel-admin';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard'; // BUG-C2 FIX
import { Registro } from './registro/registro';
import { RecuperarContrasena } from './recuperar-contrasena/recuperar-contrasena';
import { Perfil } from './perfil/perfil';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginLoginComponent },
  { path: 'registro', component: Registro },
  { path: 'recuperar-contrasena', component: RecuperarContrasena },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] }, // BUG-C2 FIX
  { path: 'panel-usuario', component: PanelUsuario, canActivate: [authGuard] }, // BUG-C2 FIX
  { path: 'generar-reporte', component: GenerarReporte, canActivate: [authGuard] }, // BUG-C2 FIX
  { path: 'panel-admin', component: PanelAdmin, canActivate: [authGuard, adminGuard] }
];
