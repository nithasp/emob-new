import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, AuthSession, AuthUser, RegisterRequest } from '../models/auth.model';

// The refresh cookie only travels on calls that send credentials
const WITH_COOKIE = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = `${environment.apiConfig.uri}v1/auth`;

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/login`, { username, password }, WITH_COOKIE)
      .pipe(map((res) => res.data));
  }

  register(request: RegisterRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/register`, request, WITH_COOKIE)
      .pipe(map((res) => res.data));
  }

  /** Signs in as the shared demo account; the API answers 404 when demo access is switched off. */
  demo(): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/demo`, {}, WITH_COOKIE)
      .pipe(map((res) => res.data));
  }

  refresh(): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/refresh`, {}, WITH_COOKIE)
      .pipe(map((res) => res.data));
  }

  logout(): Observable<unknown> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/logout`, {}, WITH_COOKIE)
      .pipe(map((res) => res.data));
  }

  fetchMe(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.baseUrl}/me`).pipe(map((res) => res.data));
  }
}
