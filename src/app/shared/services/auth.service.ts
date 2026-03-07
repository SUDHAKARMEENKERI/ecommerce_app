import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

export interface MedicalStoreSignupPayload {
  ownerName: string;
  storeName: string;
  role: string;
  storeMobile: string;
  licenseNo: string;
  gstinNumber: string;
  pharmacyCode: string;
  address: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  email?: string;
}

export interface MedicalStoreLoginPayload {
  storeMobileOrStoreId: string;
  password: string;
  loginAs: 'owner' | 'staff';
}

export interface AuthApiResponse {
  message?: string;
  accessAllowed?: boolean;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  id?: number | string;
  storeId?: number | string;
  storeName?: string;
  ownerName?: string;
  storeMobile?: string;
  email?: string;
  mobile?: string;
}

export type AuthRegisterResponse = AuthApiResponse | string;
export type AuthLoginResponse = AuthApiResponse | string;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly medicalStoreRegisterUrl = `${environment.apiBaseUrl}/api/medical-store/register`;
  private readonly medicalStoreLoginUrl = `${environment.apiBaseUrl}/api/medical-store/login`;
  private readonly storageKey = 'vendor_is_logged_in';
  private readonly loginResponseKey = 'vendor_login_response';
  private readonly tokenKey = 'ms_token';
  private readonly tokenTypeKey = 'ms_token_type';
  private readonly tokenExpiresAtKey = 'ms_token_expires_at';
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(this.readInitialState());

  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.getValue();
  }

  get loginResponse(): unknown {
    return this.readLoginResponse();
  }

  constructor(private http: HttpClient, private notificationService: NotificationService) {}

  resetPassword(payload: { email?: string; storeMobile?: string; password: string; confirmPassword: string }): Observable<any> {
    // Adjust the endpoint as per your backend API
    const url = `${environment.apiBaseUrl}/api/medical-store/reset-password`;
    return this.http.post(url, payload);
  }

  registerMedicalStore(payload: MedicalStoreSignupPayload): Observable<AuthRegisterResponse> {
    return this.http.post(this.medicalStoreRegisterUrl, payload, {
      responseType: 'text'
    });
  }

  loginMedicalStore(payload: MedicalStoreLoginPayload): Observable<AuthLoginResponse> {
    return this.http.post<AuthApiResponse>(this.medicalStoreLoginUrl, payload, {
      withCredentials: true
    });
  }

  login(responsePayload?: unknown): void {
    if (responsePayload !== undefined) {
      this.updateLoginResponse(responsePayload);
    }

    const parsed = this.normalizePayload(responsePayload);

    if (parsed?.accessAllowed === false) {
      this.clearAuth();
      localStorage.setItem(this.storageKey, 'false');
      this.isLoggedInSubject.next(false);
      this.notificationService.error('Login Activity', 'Login denied. Please clear pending billing dues and try again.');
      return;
    }

    if (parsed?.token) {
      this.setAuth(parsed.token, parsed.tokenType, parsed.expiresIn);
    } else {
      this.clearAuth();
    }

    localStorage.setItem(this.storageKey, 'true');
    this.isLoggedInSubject.next(true);
    this.notificationService.success('Login Activity', 'You are logged in successfully.');
  }

  updateLoginResponse(responsePayload: unknown): void {
    localStorage.setItem(this.loginResponseKey, this.serializeLoginResponse(responsePayload));
  }

  mergeLoginResponse(patch: Record<string, unknown>): void {
    const currentResponse = this.normalizePayload(this.readLoginResponse()) ?? {};

    this.updateLoginResponse({
      ...currentResponse,
      ...patch
    });
  }

  logout(showNotification: boolean = true): void {
    this.clearAuth();
    localStorage.setItem(this.storageKey, 'false');
    localStorage.removeItem(this.loginResponseKey);
    this.isLoggedInSubject.next(false);

    if (showNotification) {
      this.notificationService.info('Logout Activity', 'You have logged out successfully.');
    }
  }

  clearAuthSession(): void {
    this.clearAuth();
    localStorage.setItem(this.storageKey, 'false');
    localStorage.removeItem(this.loginResponseKey);
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    const token = sessionStorage.getItem(this.tokenKey);
    const rawExpiresAt = sessionStorage.getItem(this.tokenExpiresAtKey);

    if (!token) {
      return null;
    }

    if (!rawExpiresAt) {
      return token;
    }

    const expiresAt = Number(rawExpiresAt);

    if (Number.isNaN(expiresAt) || Date.now() >= expiresAt) {
      this.clearAuth();
      return null;
    }

    return token;
  }

  isTokenValid(): boolean {
    return this.readLoggedInState() || !!this.getToken();
  }

  getAuthHeaderValue(): string | null {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    const tokenType = sessionStorage.getItem(this.tokenTypeKey) || 'Bearer';
    return `${tokenType} ${token}`;
  }

  setAuth(token: string, tokenType?: string, expiresInSec?: number): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.tokenTypeKey, (tokenType || 'Bearer').trim());

    if (this.isPositiveNumber(expiresInSec)) {
      const expiresAt = Date.now() + expiresInSec * 1000;
      sessionStorage.setItem(this.tokenExpiresAtKey, String(expiresAt));
      return;
    }

    sessionStorage.removeItem(this.tokenExpiresAtKey);
  }

  clearAuth(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenTypeKey);
    sessionStorage.removeItem(this.tokenExpiresAtKey);
  }

  private readInitialState(): boolean {
    return this.readLoggedInState();
  }

  private readLoggedInState(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  private readLoginResponse(): unknown {
    const rawData = localStorage.getItem(this.loginResponseKey);

    if (!rawData) {
      return null;
    }

    try {
      return JSON.parse(rawData);
    } catch {
      return rawData;
    }
  }

  private serializeLoginResponse(responsePayload: unknown): string {
    if (typeof responsePayload === 'string') {
      return responsePayload;
    }

    try {
      return JSON.stringify(responsePayload);
    } catch {
      return String(responsePayload);
    }
  }

  private normalizePayload(payload: unknown): AuthApiResponse | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as AuthApiResponse;
      } catch {
        return null;
      }
    }

    if (typeof payload === 'object') {
      return payload as AuthApiResponse;
    }

    return null;
  }

  private isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
}
