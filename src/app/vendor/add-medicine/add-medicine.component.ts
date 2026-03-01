import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BulkUploadResponse, MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { CommonModalComponent } from '../../shared/modal/common-modal.component';

@Component({
  selector: 'app-vendor-add-medicine',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CommonModalComponent],
  templateUrl: './add-medicine.component.html',
  styleUrls: ['./add-medicine.component.scss']
})
export class VendorAddMedicineComponent {
  private destroyRef = inject(DestroyRef);

  successMessage = '';
  isSubmitting = false;
  excelUploadMessage = '';
  isBulkUploadModalOpen = false;
  bulkUploadModalVariant: 'success' | 'error' = 'success';
  bulkUploadModalTitle = '';
  bulkUploadModalMessage = '';
  bulkUploadModalActionLabel = 'OK';

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
    manufacturer: '',
    supplier: '',
    batchSize: 0
  };

  constructor(
    private medicineService: MedicineService,
    private router: Router,
    private authService: AuthService
  ) {}

  get totalQuantity(): number {
    return Math.max(0, this.form.packSize) * Math.max(0, this.form.boxQuantity);
  }

  downloadCsvTemplate() {
    const storeDetails = this.getMedicalStoreDetails();

    const headers = [
      'name',
      'composition',
      'brand',
      'category',
      'price',
      'quantity',
      'formulation',
      'strength',
      'batch',
      'mfgDate',
      'expiry',
      'packSize',
      'boxQuantity',
      'totalQuantity',
      'lowAlert',
      'rackShelf',
      'buyPrice',
      'sellPrice',
      'boxBuyPrice',
      'boxSellPrice',
      'gst',
      'manufacturer',
      'supplier',
      'batchSize',
      'email',
      'storeMobile',
      'storeId'
    ];

    const sampleRow = [
      'Paracetamol 500',
      'Paracetamol',
      'MediCare',
      'Allopathic',
      '22.0',
      '120',
      'Tablet',
      '500mg',
      'PARA-2026-01',
      '2025-01-15',
      '2027-01-15',
      '10',
      '12',
      '120',
      '20',
      'A-12',
      '18.5',
      '22.0',
      '180.0',
      '220.0',
      '12',
      'ABC Pharma',
      'Health Distributor',
      '1000',
      storeDetails.email || 'example@example.com',
      storeDetails.storeMobile || '1234567890',
      storeDetails.storeId || 'STORE123'
    ];

    if (headers.length !== sampleRow.length) {
      this.excelUploadMessage = `Template mismatch: ${headers.length} headers vs ${sampleRow.length} sample values.`;
      return;
    }

    const csv = [headers, sampleRow]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'medicine_upload_template.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
    this.excelUploadMessage = 'CSV template downloaded.';
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
      manufacturer: '',
      supplier: '',
      batchSize: 0
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

  closeBulkUploadModal() {
    this.isBulkUploadModalOpen = false;
  }

  private openBulkUploadModal(
    variant: 'success' | 'error',
    title: string,
    message: string,
    actionLabel: string
  ) {
    this.bulkUploadModalVariant = variant;
    this.bulkUploadModalTitle = title;
    this.bulkUploadModalMessage = message;
    this.bulkUploadModalActionLabel = actionLabel;
    this.isBulkUploadModalOpen = true;
  }

  async onExcelUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.excelUploadMessage = 'No file selected.';
      return;
    }
    const file = input.files[0];
    this.excelUploadMessage = 'Uploading...';
    this.medicineService.bulkUploadExcel(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: BulkUploadResponse) => {
          if (!result.success) {
            const failedMessage = result.message || 'Upload failed. Please check the file and try again.';
            this.excelUploadMessage = failedMessage;
            this.openBulkUploadModal('error', 'Upload Failed', failedMessage, 'Dismiss Error');
            return;
          }

          const uploadedMessage = result.count > 0
            ? `Uploaded successfully (${result.count} records).`
            : 'Uploaded successfully.';
          this.excelUploadMessage = uploadedMessage;
          this.openBulkUploadModal('success', 'Upload Successful', uploadedMessage, 'Understood');

          this.medicineService
            .loadMedicinesFromApi()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        },
        error: (errorResponse: unknown) => {
          const responseRecord = errorResponse as { error?: { message?: string }; message?: string };
          const failedMessage =
            responseRecord?.error?.message ||
            responseRecord?.message ||
            'Upload failed. Please try again.';
          this.excelUploadMessage = failedMessage;
          this.openBulkUploadModal('error', 'Upload Failed', failedMessage, 'Dismiss Error');
        }
      });
  }
}
