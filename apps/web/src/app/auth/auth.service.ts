import { Injectable, signal, computed } from '@angular/core';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  );

  readonly isAuthenticated = computed(() => this._token() !== null);

  getToken(): string | null {
    return this._token();
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
  }
}
