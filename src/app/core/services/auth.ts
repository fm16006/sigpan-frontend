import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TokenStorage } from './token-storage';
import { User } from '../models/user.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);

  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());

  login(credentials: { email: string; password: string }) {
    return this.http.post<{ token: string; user: User }>(
      `${environment.apiUrl}${API_ENDPOINTS.auth.login}`,
      credentials
    );
  }

  saveSession(token: string, user: User): void {
    this.tokenStorage.saveToken(token);
    this.currentUser.set(user);
  }

  logout(): void {
    this.tokenStorage.clear();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }
}