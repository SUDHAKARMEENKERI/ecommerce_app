import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '../services/user-profile.service';
import { AuthService } from '../../shared/services/auth.service';
import { MedicalStoreService } from '../services/medical-store.service';

@Component({
  selector: 'app-vendor-account',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class VendorAccountComponent {
  private destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private userProfileService: UserProfileService,
    private authService: AuthService,
    private medicalStoreService: MedicalStoreService
  ) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.profile = {
          name: user.ownerName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          pharmacy: user.pharmacyName
        };
      });
  }

  profile = {
    name: 'Sudhakar Meenkari',
    email: 'sudhakarmeenkari@gmail.com',
    phone: '876543210',
    role: 'Owner',
    pharmacy: 'Test Pharmacy'
  };

  passwordForm = {
    // currentPassword: '',
    password: '',
    confirmPassword: ''
  };

  profileStatusMessage = 'All profile changes are saved.';
  securityStatusMessage = 'Security settings are up to date.';
  savingProfile = false;
  savingSecurity = false;

  get initials(): string {
    const parts = this.profile.name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  saveProfile() {
    if (this.savingProfile) {
      return;
    }

    this.savingProfile = true;
    this.profileStatusMessage = 'Saving profile...';

    // Get storeId from authService
    let storeId = '';
    const loginResponse = this.authService.loginResponse as any;
    if (loginResponse) {
      storeId = loginResponse.storeId || loginResponse.medicalStoreId || '';
    }
    if (!storeId) {
      this.savingProfile = false;
      this.profileStatusMessage = 'Store ID not found.';
      return;
    }

    const updatedProfile = {
      ownerName: this.profile.name,
      email: this.profile.email,
      phone: this.profile.phone,
      pharmacyName: this.profile.pharmacy
    };

    this.medicalStoreService.patchStore(storeId, updatedProfile).subscribe({
      next: () => {
        this.userProfileService.updateProfile(updatedProfile);
        // Update localStorage login response if present
        const loginResponseKey = 'vendor_login_response';
        const raw = localStorage.getItem(loginResponseKey);
        if (raw) {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          if (typeof parsed === 'object' && parsed) {
            parsed.ownerName = updatedProfile.ownerName;
            parsed.fullName = updatedProfile.ownerName;
            parsed.email = updatedProfile.email;
            parsed.phone = updatedProfile.phone;
            parsed.pharmacyName = updatedProfile.pharmacyName;
            localStorage.setItem(loginResponseKey, JSON.stringify(parsed));
          }
        }
        this.savingProfile = false;
        this.profileStatusMessage = 'Profile updated successfully.';
      },
      error: () => {
        this.savingProfile = false;
        this.profileStatusMessage = 'Failed to update profile.';
      }
    });
  }

  updatePassword() {
    if (this.savingSecurity) {
      return;
    }

    if (!this.passwordForm.password || !this.passwordForm.confirmPassword) {
      this.securityStatusMessage = 'Please fill all password fields.';
      return;
    }

    if (this.passwordForm.password !== this.passwordForm.confirmPassword) {
      this.securityStatusMessage = 'New password and confirm password do not match.';
      return;
    }

    this.savingSecurity = true;
    this.securityStatusMessage = 'Updating password...';

    // Get storeId from authService
    let storeId = '';
    const loginResponse = this.authService.loginResponse as any;
    if (loginResponse) {
      storeId = loginResponse.storeId || loginResponse.medicalStoreId || '';
    }
    if (!storeId) {
      this.savingSecurity = false;
      this.securityStatusMessage = 'Store ID not found.';
      return;
    }

    const payload = {
      // currentPassword: this.passwordForm.currentPassword,
      password: this.passwordForm.password
    };

    this.medicalStoreService.patchStore(storeId, payload).subscribe({
      next: () => {
        this.savingSecurity = false;
        this.securityStatusMessage = 'Password updated successfully.';
        this.passwordForm = {
          // currentPassword: '',//
          password: '',
          confirmPassword: ''
        };
      },
      error: (err) => {
        this.savingSecurity = false;
        this.securityStatusMessage = 'Failed to update password.';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/vendor/login']);
  }
}
