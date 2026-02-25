import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-vendor-add-medicine',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-medicine.component.html',
  styleUrls: ['./add-medicine.component.scss']
})
export class VendorAddMedicineComponent {
  private destroyRef = inject(DestroyRef);

  successMessage = '';
  isSubmitting = false;

  form = {
    medicineName: '',
    composition: '',
    brandName: '',
    category: 'Allopathic',
    formulation: 'Tablet',
    strength: '',
    batchNo: '',
    mfgDate: '',
    expiryDate: '',
    packSize: 0,
    boxQuantity: 0,
    lowAlert: 10,
    rackShelf: '',
    buyPrice: 0,
    sellPrice: 0,
    boxBuyPrice: 0,
    boxSellPrice: 0,
    gst: 0,
  };

  constructor(
    private medicineService: MedicineService,
    private router: Router,
    private authService: AuthService
  ) {}

  get totalQuantity(): number {
    return Math.max(0, this.form.packSize) * Math.max(0, this.form.boxQuantity);
  }

  submitMedicine() {
    if (this.isSubmitting) {
      return;
    }

    if (!this.form.medicineName.trim() || !this.form.composition.trim() || !this.form.batchNo.trim()) {
      return;
    }

    this.isSubmitting = true;

    const expiry = this.form.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);
    const storeDetails = this.getMedicalStoreDetails();

    this.medicineService
      .addMedicineViaApi({
        name: this.form.medicineName,
        brand: this.form.brandName,
        composition: this.form.composition,
        category: this.form.category,
        batch: this.form.batchNo,
        expiry,
        quantity: this.totalQuantity,
        price: this.form.sellPrice > 0 ? this.form.sellPrice : this.form.boxSellPrice,
        ...storeDetails
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Medicine added successfully. Redirecting to Inventory...';
          this.resetForm();
          this.isSubmitting = false;

          setTimeout(() => {
            this.router.navigate(['/vendor/inventory']);
          }, 900);
        },
        error: () => {
          this.isSubmitting = false;
          this.successMessage = 'Failed to add medicine. Please try again.';
        }
      });
  }

  private resetForm() {
    this.form = {
      medicineName: '',
      composition: '',
      brandName: '',
      category: 'Allopathic',
      formulation: 'Tablet',
      strength: '',
      batchNo: '',
      mfgDate: '',
      expiryDate: '',
      packSize: 0,
      boxQuantity: 0,
      lowAlert: 10,
      rackShelf: '',
      buyPrice: 0,
      sellPrice: 0,
      boxBuyPrice: 0,
      boxSellPrice: 0,
      gst: 0,
    };
  }

  private getMedicalStoreDetails(): {
    storeMobile: string;
    email: string;
    storeId: string;
  } {
    const response = this.authService.loginResponse;
    const source = this.extractSource(response);

    return {
      storeMobile: this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']),
      email: this.pickValue(source, ['email', 'mailId', 'storeEmail']),
      storeId: this.pickValue(source, ['storeId'])
    };
  }

  private extractSource(payload: unknown): Record<string, unknown> {
    if (!payload) {
      return {};
    }

    if (typeof payload === 'string') {
      try {
        return this.extractSource(JSON.parse(payload));
      } catch {
        return {};
      }
    }

    if (typeof payload !== 'object') {
      return {};
    }

    const record = payload as Record<string, unknown>;
    const nestedData = record['data'];

    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }

    return record;
  }

  private pickValue(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }
}
