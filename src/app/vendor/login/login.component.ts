import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLoginResponse, AuthService, MedicalStoreLoginPayload } from '../../shared/services/auth.service';
import { CommonModalComponent } from '../../shared/modal/common-modal.component';
import { MedicalStoreService } from '../services/medical-store.service';
import { UserProfileService } from '../services/user-profile.service';

@Component({
  selector: 'app-vendor-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommonModalComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class VendorLoginComponent {
  storeId = '';
  password = '';
  role: MedicalStoreLoginPayload['loginAs'] = 'owner';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  isErrorModalOpen = false;
  modalMessage = '';
  private readonly pendingBillingMessage = 'Your billing payment is pending. Please clear the due bill to continue logging in.';

  constructor(
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private medicalStoreService: MedicalStoreService,
    private userProfileService: UserProfileService
  ) {
    this.route.queryParamMap.subscribe((params) => {
      this.successMessage = params.get('created') === '1' ? 'Account created successfully. Please login.' : '';
    });
  }

  onSubmit() {
    if (!this.storeId.trim() || !this.password.trim()) {
      this.openErrorModal('Please enter store ID/mobile and password.');
      return;
    }

    if (this.password.trim().length < 6) {
      this.openErrorModal('Password must be at least 6 characters.');
      return;
    }

    const payload: MedicalStoreLoginPayload = {
      storeMobileOrStoreId: this.storeId.trim(),
      password: this.password.trim(),
      loginAs: this.role
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isErrorModalOpen = false;
    this.modalMessage = '';

    this.isSubmitting = true;
    this.authService.loginMedicalStore(payload).subscribe({
      next: (response) => {
        const parsedResponse = this.parseResponsePayload(response);
        const authPayload = parsedResponse ?? this.parseResponsePayload(this.authService.loginResponse);

        if (!this.isAccessAllowed(parsedResponse)) {
          this.isSubmitting = false;
          this.openErrorModal(this.pendingBillingMessage);
          return;
        }

        this.successMessage = this.getLoginSuccessMessage(parsedResponse ?? response) || 'Login successful. Redirecting...';
        this.authService.login(parsedResponse ?? response);
        this.loadMedicalStoreDetails(authPayload);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;

        this.openErrorModal(this.getLoginErrorMessage(error));
      }
    });
  }

  closeErrorModal() {
    this.isErrorModalOpen = false;
    this.modalMessage = '';
  }

  private openErrorModal(message: string) {
    this.errorMessage = message;
    this.modalMessage = message;
    this.isErrorModalOpen = true;
  }

  private getLoginSuccessMessage(response: AuthLoginResponse): string {
    if (typeof response === 'string') {
      return response;
    }

    return response?.message || '';
  }

  private getLoginErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Unable to connect to server. Please try again.';
    }

    const parsedError = this.tryParseError(error.error);

    if (parsedError?.accessAllowed === false) {
      return this.pendingBillingMessage;
    }

    if (parsedError?.status === 401) {
      return 'Invalid credentials. Please check mobile/store ID and password.';
    }

    if (parsedError?.status === 400) {
      return 'Please enter valid login details and try again.';
    }

    if (error.status === 401) {
      return 'Invalid credentials. Please check mobile/store ID and password.';
    }

    if (error.status === 400) {
      return 'Please enter valid login details and try again.';
    }

    return 'Login failed. Please try again in a moment.';
  }

  private parseResponsePayload(payload: unknown): Record<string, unknown> | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }

    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    return null;
  }

  private loadMedicalStoreDetails(loginPayload: Record<string, unknown> | null): void {
    const token = this.readString(loginPayload, ['token']) || this.authService.getToken() || '';
    const decodedToken = this.decodeJwtPayload(token);
    const email = this.readString(decodedToken, ['email', 'mailId', 'sub']) || this.readString(loginPayload, ['email', 'mailId']);
    const mobile =
      this.readString(decodedToken, ['mobile', 'storeMobile', 'phone', 'mobileNo']) ||
      this.readString(loginPayload, ['mobile', 'storeMobile', 'phone', 'mobileNo']);

    if (!email || !mobile) {
      this.finishLogin();
      return;
    }

    this.medicalStoreService.getStoreDetails(email, mobile).subscribe({
      next: (detailsResponse) => {
        const detailsPayload = this.parseResponsePayload(detailsResponse) ?? { email, storeMobile: mobile };

        this.authService.mergeLoginResponse({
          ...detailsPayload,
          email,
          storeMobile: this.readString(detailsPayload, ['storeMobile', 'mobile', 'phone', 'mobileNo']) || mobile
        });

        this.finishLogin();
      },
      error: () => {
        this.finishLogin();
      }
    });
  }

  private finishLogin(): void {
    this.isSubmitting = false;
    this.userProfileService.syncProfileFromLoginResponse();

    setTimeout(() => {
      this.router.navigate(['/vendor/dashboard']);
    }, 500);
  }

  private isAccessAllowed(payload: Record<string, unknown> | null): boolean {
    if (!payload) {
      return true;
    }

    return payload['accessAllowed'] !== false;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    try {
      const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      const decodedPayload = atob(paddedPayload);
      const jsonPayload = decodeURIComponent(
        Array.from(decodedPayload)
          .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join('')
      );

      return JSON.parse(jsonPayload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readString(source: Record<string, unknown> | null, keys: string[]): string {
    if (!source) {
      return '';
    }

    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private tryParseError(errorPayload: unknown): { status?: number; message?: string; accessAllowed?: boolean } | null {
    if (!errorPayload) {
      return null;
    }

    if (typeof errorPayload === 'object') {
      return errorPayload as { status?: number; message?: string; accessAllowed?: boolean };
    }

    if (typeof errorPayload === 'string') {
      try {
        return JSON.parse(errorPayload) as { status?: number; message?: string; accessAllowed?: boolean };
      } catch {
        return null;
      }
    }

    return null;
  }
}