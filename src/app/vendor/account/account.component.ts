import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '../services/user-profile.service';
import { AuthService } from '../../shared/services/auth.service';

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
    private authService: AuthService
  ) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.profile = {
          name: user.fullName,
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
    pharmacy: 'PharmaDesk Main Branch'
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
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

    setTimeout(() => {
      this.userProfileService.updateProfile({
        fullName: this.profile.name,
        email: this.profile.email,
        phone: this.profile.phone,
        pharmacyName: this.profile.pharmacy
      });

      this.savingProfile = false;
      this.profileStatusMessage = 'Profile updated successfully.';
    }, 700);
  }

  updatePassword() {
    if (this.savingSecurity) {
      return;
    }

    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.securityStatusMessage = 'Please fill all password fields.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.securityStatusMessage = 'New password and confirm password do not match.';
      return;
    }

    this.savingSecurity = true;
    this.securityStatusMessage = 'Updating password...';

    setTimeout(() => {
      this.savingSecurity = false;
      this.securityStatusMessage = 'Password updated successfully.';
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    }, 700);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/vendor/login']);
  }
}
