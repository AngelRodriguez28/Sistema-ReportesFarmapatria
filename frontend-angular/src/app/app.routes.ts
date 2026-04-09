import { Routes } from '@angular/router';
import { LoginLoginComponent } from './login/login';
import { PanelUsuario } from './panel-usuario/panel-usuario';
import { GenerarReporte } from './generar-reporte/generar-reporte';
import { PanelAdmin } from './panel-admin/panel-admin';
import { adminGuard } from './guards/admin.guard';
import { Registro } from './registro/registro';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginLoginComponent },
  { path: 'registro', component: Registro },
  { path: 'panel-usuario', component: PanelUsuario },
  { path: 'generar-reporte', component: GenerarReporte },
  { path: 'panel-admin', component: PanelAdmin, canActivate: [adminGuard] }
];
