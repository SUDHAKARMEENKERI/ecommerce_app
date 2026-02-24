import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MedicineService } from '../services/medicine.service';

@Component({
  selector: 'app-vendor-add-medicine',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-medicine.component.html',
  styleUrls: ['./add-medicine.component.scss']
})
export class VendorAddMedicineComponent {
  successMessage = '';
  isSubmitting = false;

  form = {
    medicineName: 'Dolo 650',
    composition: 'Paracetamol 650mg',
    brandName: 'Micro Labs',
    category: 'Allopathic',
    formulation: 'Tablet',
    strength: '500mg',
    batchNo: 'BATCH001',
    mfgDate: '',
    expiryDate: '',
    packSize: 0,
    boxQuantity: 0,
    lowAlert: 10,
    rackShelf: 'A-12',
    buyPrice: 0,
    sellPrice: 0,
    boxBuyPrice: 0,
    boxSellPrice: 0,
    gst: 0,
    notes: ''
  };

  constructor(
    private medicineService: MedicineService,
    private router: Router
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

    this.medicineService.addMedicine({
      name: this.form.medicineName,
      brand: this.form.brandName,
      composition: this.form.composition,
      category: this.form.category,
      batch: this.form.batchNo,
      expiry,
      quantity: this.totalQuantity,
      price: this.form.sellPrice > 0 ? this.form.sellPrice : this.form.boxSellPrice
    });

    this.successMessage = 'Medicine added successfully. Redirecting to Inventory...';

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
      notes: ''
    };

    setTimeout(() => {
      this.router.navigate(['/vendor/inventory']);
    }, 900);
  }
}
