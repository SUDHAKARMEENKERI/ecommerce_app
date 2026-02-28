import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

interface ResetPasswordPayload {
  email?: string;
  storeMobile?: string;
  password: string;
  confirmPassword: string;
}
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../../shared/loader/loader.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  storeMobile: string = '';
  password: string = '';
  confirmPassword: string = '';
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}
  onBackToLogin() {
    this.router.navigate(['/vendor/login']);
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.email && !this.storeMobile) {
      this.errorMessage = 'Please enter email or store mobile number.';
      return;
    }
    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Please enter and confirm your new password.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    const payload: ResetPasswordPayload = {
      email: this.email || undefined,
      storeMobile: this.storeMobile || undefined,
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res: any) => {
        this.successMessage = res?.message || 'Password reset successful!';
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to reset password.';
        this.isSubmitting = false;
      }
    });
  }
}
