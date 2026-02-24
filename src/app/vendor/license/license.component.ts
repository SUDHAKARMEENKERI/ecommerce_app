import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type PlanKey = 'monthly' | 'halfYearly' | 'yearly';

@Component({
  selector: 'app-vendor-license',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss']
})
export class VendorLicenseComponent {
  licenseKey = '';
  selectedPlan: PlanKey = 'halfYearly';
  statusMessage = '';

  selectPlan(plan: PlanKey) {
    this.selectedPlan = plan;
  }

  redeemKey() {
    const value = this.licenseKey.trim();

    if (!value) {
      this.statusMessage = 'Please enter a license key.';
      return;
    }

    this.statusMessage = 'License key submitted successfully.';
    this.licenseKey = '';
  }
}
