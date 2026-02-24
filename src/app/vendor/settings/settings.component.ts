import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '../services/user-profile.service';

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
    pharmacyName: '',
    phoneNumber: '',
    gstinNumber: '',
    pharmacyCode: '',
    address: ''
  };

  accountForm = {
    fullName: '',
    email: ''
  };

  profile = {
    name: '',
    email: ''
  };

  constructor(private userProfileService: UserProfileService) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.businessForm = {
          pharmacyName: user.pharmacyName,
          phoneNumber: user.phone,
          gstinNumber: user.gstinNumber,
          pharmacyCode: user.pharmacyCode,
          address: user.address
        };

        this.accountForm = {
          fullName: user.fullName,
          email: user.email
        };

        this.profile = {
          name: user.fullName,
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

    setTimeout(() => {
      this.userProfileService.updateProfile({
        pharmacyName: this.businessForm.pharmacyName,
        phone: this.businessForm.phoneNumber,
        gstinNumber: this.businessForm.gstinNumber,
        address: this.businessForm.address
      });

      this.isSavingBusiness = false;
      this.businessSaveMessage = 'Saved successfully';
    }, 700);
  }

  saveAccount() {
    if (this.isSavingAccount) {
      return;
    }

    this.isSavingAccount = true;
    this.accountSaveMessage = 'Saving...';

    setTimeout(() => {
      this.userProfileService.updateProfile({
        fullName: this.accountForm.fullName,
        email: this.accountForm.email
      });

      this.isSavingAccount = false;
      this.accountSaveMessage = 'Saved successfully';
    }, 700);
  }
}
