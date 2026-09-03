import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario } from '../core/models/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(credenciales: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credenciales);
  }

  setupMFA(token: string, regenerate = false): Observable<any> {
    const url = regenerate ? `${this.apiUrl}/login/mfa/setup?regenerate=true` : `${this.apiUrl}/login/mfa/setup`;
    return this.http.get<any>(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  verifyMFA(token: string, mfaCode: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login/mfa/verify`, { token, mfaCode });
  }

  registro(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registro`, datos);
  }

  recuperarContrasena(datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/recuperar-contrasena`, datos);
  }

  actualizarPerfil(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, datos);
  }

  subirAvatar(id: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/${id}/avatar`, formData);
  }
}
