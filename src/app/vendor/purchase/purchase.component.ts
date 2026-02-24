import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicineItem, MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerService } from '../services/customer.service';
import { InvoiceService } from '../services/invoice.service';

type CartItem = {
  medicine: MedicineItem;
  qty: number;
};

@Component({
  selector: 'app-vendor-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.scss']
})
export class VendorPurchaseComponent {
  private destroyRef = inject(DestroyRef);

  constructor(
    private medicineService: MedicineService,
    private customerService: CustomerService,
    private invoiceService: InvoiceService
  ) {
    this.medicineService.medicines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((medicines) => {
        this.medicines = medicines;
      });
  }

  shortcuts = ['F2 Search', 'F4 Payment', 'F9 Billing'];
  medicineQuery = '';
  medicines: MedicineItem[] = [];
  cartItems: CartItem[] = [];
  customerPhone = '';
  customerName = '';
  patientGender = 'Male';
  patientAge = '';
  consultingDoctor = 'Dr. MALLIKARJUN PANSHETTY (INTENSIVIST & PAIN MGT)';
  referredBy = 'Direct';
  invoiceMessage = '';
  invoiceMessageType: 'success' | 'error' = 'success';

  get filteredMedicines(): MedicineItem[] {
    const query = this.medicineQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return this.medicines
      .filter((item) => item.quantity > 0)
      .filter((item) => [item.name, item.brand, item.composition, item.batch].join(' ').toLowerCase().includes(query))
      .slice(0, 6);
  }

  get hasSearchResults(): boolean {
    return this.medicineQuery.trim().length > 0 && this.filteredMedicines.length > 0;
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.medicine.price * item.qty, 0);
  }

  get canGenerateInvoice(): boolean {
    return this.cartItems.length > 0;
  }

  onMedicineSearch(value: string) {
    this.medicineQuery = value;
  }

  onPatientAgeInput(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      this.patientAge = '';
      return;
    }

    this.patientAge = String(Math.min(120, Number(digits)));
  }

  disableNumberScroll(event: WheelEvent) {
    event.preventDefault();
    const target = event.target as HTMLInputElement | null;
    target?.blur();
  }

  addMedicineToCart(medicine: MedicineItem) {
    const reserved = this.medicineService.decreaseStock(medicine.id, 1);
    if (!reserved) {
      return;
    }

    const existing = this.cartItems.find((item) => item.medicine.id === medicine.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cartItems = [...this.cartItems, { medicine, qty: 1 }];
    }

    this.medicineQuery = '';
  }

  incrementQty(item: CartItem) {
    const reserved = this.medicineService.decreaseStock(item.medicine.id, 1);
    if (!reserved) {
      return;
    }

    item.qty += 1;
  }

  decrementQty(item: CartItem) {
    this.medicineService.increaseStock(item.medicine.id, 1);

    if (item.qty <= 1) {
      this.cartItems = this.cartItems.filter((cartItem) => cartItem.medicine.id !== item.medicine.id);
      return;
    }

    item.qty -= 1;
  }

  generateInvoice() {
    if (this.cartItems.length === 0) {
      this.showInvoiceMessage('Add at least one medicine to generate invoice.', 'error');
      return;
    }

    const customerName = this.customerName.trim() || 'Walk-in Customer';
    const customerPhone = this.customerPhone.trim() || 'NA';
    const patientGender = this.patientGender.trim() || 'Male';
    const ageDigits = this.patientAge.replace(/\D/g, '');
    const patientAge = ageDigits ? `${ageDigits} Years` : 'NA';
    const doctorName = this.consultingDoctor.trim() || 'NA';
    const referredBy = this.referredBy.trim() || 'Direct';

    const itemCount = this.cartItems.reduce((sum, item) => sum + item.qty, 0);
    const lineItems = this.cartItems.map((item) => ({
      medicineName: item.medicine.name,
      brand: item.medicine.brand,
      composition: item.medicine.composition,
      batch: item.medicine.batch,
      qty: item.qty,
      unitPrice: item.medicine.price,
      total: item.medicine.price * item.qty
    }));
    const invoice = this.invoiceService.createInvoice({
      customerName,
      customerPhone,
      patientGender,
      patientAge,
      doctorName,
      referredBy,
      amount: this.subtotal,
      itemCount,
      lineItems
    });

    this.customerService.recordPurchase({
      name: customerName,
      phone: customerPhone,
      amount: this.subtotal,
      date: invoice.date
    });

    this.cartItems = [];
    this.medicineQuery = '';
    this.customerName = '';
    this.customerPhone = '';
    this.patientGender = 'Male';
    this.patientAge = '';
    this.referredBy = 'Direct';
    this.showInvoiceMessage(`${invoice.id} generated and synced.`, 'success');
  }

  private showInvoiceMessage(message: string, type: 'success' | 'error') {
    this.invoiceMessage = message;
    this.invoiceMessageType = type;

    setTimeout(() => {
      this.invoiceMessage = '';
    }, 1800);
  }

  trackByMedicineId(_index: number, item: MedicineItem) {
    return item.id;
  }

  trackByCartMedicineId(_index: number, item: CartItem) {
    return item.medicine.id;
  }
}
