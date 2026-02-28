import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  loginAs: string;
}

export interface AuthApiResponse {
  message?: string;
}

export type AuthRegisterResponse = AuthApiResponse | string;
export type AuthLoginResponse = AuthApiResponse | string;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly medicalStoreRegisterUrl = `${environment.apiBaseUrl}/api/medical-store/register`;
  private readonly medicalStoreLoginUrl = `${environment.apiBaseUrl}/api/medical-store/login`;
  private readonly storageKey = 'vendor_is_logged_in';
  private readonly loginResponseKey = 'vendor_login_response';
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(this.readInitialState());

  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.getValue();
  }

  get loginResponse(): unknown {
    return this.readLoginResponse();
  }

  constructor(private http: HttpClient) {}

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
    return this.http.post(this.medicalStoreLoginUrl, payload, {
      responseType: 'text'
    });
  }

  login(responsePayload?: unknown): void {
    localStorage.setItem(this.storageKey, 'true');

    if (responsePayload !== undefined) {
      localStorage.setItem(this.loginResponseKey, this.serializeLoginResponse(responsePayload));
    }

    this.isLoggedInSubject.next(true);
  }

  logout(): void {
    localStorage.setItem(this.storageKey, 'false');
    localStorage.removeItem(this.loginResponseKey);
    this.isLoggedInSubject.next(false);
  }

  private readInitialState(): boolean {
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
}
