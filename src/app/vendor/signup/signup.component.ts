import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, MedicalStoreSignupPayload } from '../../shared/services/auth.service';
import { CommonModalComponent } from '../../shared/modal/common-modal.component';

@Component({
  selector: 'app-vendor-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommonModalComponent],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class VendorSignupComponent {
  ownerName = '';
  storeName = '';
  role = 'Owner';
  storeMobile = '';
  email = '';
  licenseNo = '';
  gstinNumber = '';
  pharmacyCode = '';
  address = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  isSubmitting = false;
  isErrorModalOpen = false;
  modalMessage = '';

  errorMessage = '';
  successMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  onSubmit() {
    if (
      !this.ownerName.trim() ||
      !this.storeName.trim() ||
      !this.role.trim() ||
      !this.storeMobile.trim() ||
      !this.licenseNo.trim() ||
      !this.gstinNumber.trim() ||
      !this.pharmacyCode.trim() ||
      !this.address.trim() ||
      !this.password.trim() ||
      !this.confirmPassword.trim()
    ) {
      this.errorMessage = 'Please fill all required fields.';
      this.successMessage = '';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Password and confirm password must match.';
      this.successMessage = '';
      return;
    }

    if (!this.agreeTerms) {
      this.errorMessage = 'Please accept terms to continue.';
      this.successMessage = '';
      return;
    }

    const payload: MedicalStoreSignupPayload = {
      ownerName: this.ownerName.trim(),
      storeName: this.storeName.trim(),
      role: this.role.trim(),
      storeMobile: this.storeMobile.trim(),
      licenseNo: this.licenseNo.trim(),
      gstinNumber: this.gstinNumber.trim(),
      pharmacyCode: this.pharmacyCode.trim(),
      address: this.address.trim(),
      password: this.password.trim(),
      confirmPassword: this.confirmPassword.trim(),
      agreeTerms: this.agreeTerms,
      ...(this.email.trim() ? { email: this.email.trim() } : {})
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    this.authService.registerMedicalStore(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if(response) {
            this.router.navigate(['/vendor/login']);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (error.status === 200) {
            this.router.navigate(['/vendor/login'], { queryParams: { created: '1' } });
            return;
        }

        this.errorMessage = '';
        this.modalMessage = error?.error?.message || 'Signup failed. Please try again.';
        this.isErrorModalOpen = true;
      }
    });
  }

  closeErrorModal() {
    this.isErrorModalOpen = false;
    this.modalMessage = '';
  }
}
