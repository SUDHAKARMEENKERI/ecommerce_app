import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLoginResponse, AuthService, MedicalStoreLoginPayload } from '../../shared/services/auth.service';
import { CommonModalComponent } from '../../shared/modal/common-modal.component';
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
  role = 'owner';
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

        if (!this.isAccessAllowed(parsedResponse)) {
          this.isSubmitting = false;
          this.openErrorModal(this.pendingBillingMessage);
          return;
        }

        this.isSubmitting = false;
        this.successMessage = this.getLoginSuccessMessage(parsedResponse ?? response) || 'Login successful. Redirecting...';
        this.authService.login(parsedResponse ?? response);
        this.userProfileService.syncProfileFromLoginResponse();

        setTimeout(() => {
          this.router.navigate(['/vendor/dashboard']);
        }, 500);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;

        if (error.status === 200) {
          const parsedResponse = this.parseResponsePayload(error.error);

          if (!this.isAccessAllowed(parsedResponse)) {
            this.openErrorModal(this.pendingBillingMessage);
            return;
          }

          this.successMessage = 'Login successful. Redirecting...';
          this.authService.login(parsedResponse ?? error.error);
          this.userProfileService.syncProfileFromLoginResponse();

          setTimeout(() => {
            this.router.navigate(['/vendor/dashboard']);
          }, 500);
          return;
        }

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

  private isAccessAllowed(payload: Record<string, unknown> | null): boolean {
    if (!payload) {
      return true;
    }

    return payload['accessAllowed'] !== false;
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