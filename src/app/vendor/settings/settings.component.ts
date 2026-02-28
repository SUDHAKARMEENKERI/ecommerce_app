import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '../services/user-profile.service';
import { MedicalStoreService } from '../services/medical-store.service';
import { AuthService } from '../../shared/services/auth.service';

type SettingsTab = 'business' | 'account' | 'notifications' | 'billing';

@Component({
  selector: 'app-vendor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class VendorSettingsComponent {
  private destroyRef = inject(DestroyRef);

  activeTab: SettingsTab = 'business';
  isSavingBusiness = false;
  isSavingAccount = false;
  businessSaveMessage = 'All changes saved';
  accountSaveMessage = 'All changes saved';

  businessForm = {
    ownerName: '',
    storeName: '',
    storeMobile: '',
    gstinNumber: '',
    pharmacyCode: '',
    address: '',
    phoneNumber: ''
  };

  accountForm = {
    ownerName: '',
    email: ''
  };

  profile = {
    name: '',
    email: ''
  };

  constructor(
    private userProfileService: UserProfileService,
    private medicalStoreService: MedicalStoreService,
    private authService: AuthService
  ) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.businessForm = {
          ownerName: user.ownerName,
          storeName: user.pharmacyName,
          storeMobile: user.phone,
          gstinNumber: user.gstinNumber,
          pharmacyCode: user.pharmacyCode,
          address: user.address,
          phoneNumber:  user.phone
        };

        this.accountForm = {
          ownerName: user.ownerName,
          email: user.email
        };

        this.profile = {
          name: user.ownerName,
          email: user.email
        };
      });
  }

  setActiveTab(tab: SettingsTab) {
    this.activeTab = tab;
  }

  saveBusiness() {
    if (this.isSavingBusiness) {
      return;
    }

    this.isSavingBusiness = true;
    this.businessSaveMessage = 'Saving...';

    // Get storeId from authService
    let storeId = '';
    const loginResponse = this.authService.loginResponse as any;
    if (loginResponse) {
      storeId = loginResponse.storeId || loginResponse.medicalStoreId || '';
    }
    if (!storeId) {
      this.isSavingBusiness = false;
      this.businessSaveMessage = 'Store ID not found';
      return;
    }

    const payload = {
      ownerName: this.businessForm.ownerName,
      storeName: this.businessForm.storeName,
      storeMobile: this.businessForm.storeMobile,
      gstinNumber: this.businessForm.gstinNumber,
      pharmacyCode: this.businessForm.pharmacyCode,
      address: this.businessForm.address,
      phoneNumber: this.businessForm.phoneNumber
    };

    this.medicalStoreService.patchStore(storeId, payload).subscribe({
      next: () => {
        this.userProfileService.updateProfile(payload);
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
            parsed.ownerName = payload.ownerName;
            parsed.fullName = payload.ownerName;
            // Only update email if it exists in payload
            if ('email' in payload) {
              parsed.email = payload.email || parsed.email;
            }
            parsed.phone = payload.storeMobile || payload.phoneNumber || parsed.phone;
            parsed.storeMobile = payload.storeMobile || parsed.storeMobile;
            parsed.pharmacyName = payload.storeName || parsed.pharmacyName;
            parsed.gstinNumber = payload.gstinNumber || parsed.gstinNumber;
            parsed.pharmacyCode = payload.pharmacyCode || parsed.pharmacyCode;
            parsed.address = payload.address || parsed.address;
            localStorage.setItem(loginResponseKey, JSON.stringify(parsed));
          }
        }
        this.isSavingBusiness = false;
        this.businessSaveMessage = 'Saved successfully';
      },
      error: (err) => {
        this.isSavingBusiness = false;
        this.businessSaveMessage = 'Failed to save';
      }
    });
  }

  saveAccount() {
    if (this.isSavingAccount) {
      return;
    }

    this.isSavingAccount = true;
    this.accountSaveMessage = 'Saving...';

    // Get storeId from authService
    let storeId = '';
    const loginResponse = this.authService.loginResponse as any;
    if (loginResponse) {
      storeId = loginResponse.storeId || loginResponse.medicalStoreId || '';
    }
    if (!storeId) {
      this.isSavingAccount = false;
      this.accountSaveMessage = 'Store ID not found';
      return;
    }

    const payload = {
      ownerName: this.accountForm.ownerName,
      email: this.accountForm.email
    };

    this.medicalStoreService.patchStore(storeId, payload).subscribe({
      next: () => {
        this.userProfileService.updateProfile(payload);
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
            parsed.ownerName = payload.ownerName;
            parsed.fullName = payload.ownerName;
            parsed.email = payload.email || parsed.email;
            localStorage.setItem(loginResponseKey, JSON.stringify(parsed));
          }
        }
        this.isSavingAccount = false;
        this.accountSaveMessage = 'Saved successfully';
      },
      error: (err) => {
        this.isSavingAccount = false;
        this.accountSaveMessage = 'Failed to save';
      }
    });
  }
}
