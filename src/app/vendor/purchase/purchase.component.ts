import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicineItem, MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerItem, CustomerService } from '../services/customer.service';
import { InvoiceService } from '../services/invoice.service';
import { AuthService } from '../../shared/services/auth.service';

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
    private invoiceService: InvoiceService,
    private authService: AuthService
  ) {
    this.medicineService.medicines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((medicines) => {
        this.medicines = medicines;
      });

    this.medicineService
      .loadMedicinesFromApi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.customerService.customers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((customers) => {
        this.customers = customers;
      });
  }

  shortcuts = ['F2 Search', 'F4 Payment', 'F9 Billing'];
  medicineQuery = '';
  medicines: MedicineItem[] = [];
  customers: CustomerItem[] = [];
  cartItems: CartItem[] = [];
  customerPhone = '';
  customerName = '';
  matchedCustomer: CustomerItem | null = null;
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

  onCustomerPhoneChange(value: string) {
    this.customerPhone = value.replace(/\D/g, '').slice(0, 10);
    this.tryResolveCustomerProfile('phone');
  }

  onCustomerNameChange(value: string) {
    this.customerName = value;
    this.tryResolveCustomerProfile('name');
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
    const profile = this.resolveCustomerByInputs();
    const patientGender = profile?.gender || 'NA';
    const patientAge = profile?.age || 'NA';
    const doctorName = profile?.doctorName || 'NA';
    const referredBy = profile?.referredBy || 'Direct';

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

    const invoicePayload = {
      customerName,
      customerPhone,
      patientGender,
      patientAge,
      doctorName,
      referredBy,
      amount: this.subtotal,
      itemCount,
      lineItems,
      date: new Date().toISOString()
    };
    this.invoiceService.createInvoiceViaApi(invoicePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice) => {
          const billedAmount = this.subtotal;
          this.syncCustomerPurchaseDetails(profile?.id ?? '', customerName, customerPhone, billedAmount, invoice.date);
          this.cartItems = [];
          this.medicineQuery = '';
          this.customerName = '';
          this.customerPhone = '';
          this.matchedCustomer = null;
          this.showInvoiceMessage(`${invoice.id} generated and synced.`, 'success');
        },
        error: () => {
          this.showInvoiceMessage('Failed to create invoice.', 'error');
        }
      });
  }

  private syncCustomerPurchaseDetails(
    customerId: string,
    customerName: string,
    customerPhone: string,
    billedAmount: number,
    visitedAt: string
  ) {
    if (!customerPhone || customerPhone === 'NA') {
      return;
    }

    if (!customerId.trim()) {
      this.customerService.recordPurchase({
        name: customerName,
        phone: customerPhone,
        amount: billedAmount,
        date: visitedAt
      });
      return;
    }

    const storeDetails = this.getMedicalStoreDetails();
    if (!storeDetails.email || !storeDetails.storeMobile || !storeDetails.storeId) {
      this.customerService.recordPurchase({
        name: customerName,
        phone: customerPhone,
        amount: billedAmount,
        date: visitedAt
      });
      return;
    }

    this.customerService
      .updateCustomerPurchaseDetails({
        customerId,
        name: customerName,
        phone: customerPhone,
        spent: billedAmount,
        visited: visitedAt,
        ...storeDetails
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.customerService.recordPurchase({
            name: customerName,
            phone: customerPhone,
            amount: billedAmount,
            date: visitedAt
          });
        }
      });
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

  private tryResolveCustomerProfile(source: 'phone' | 'name') {
    const resolved = this.resolveCustomerByInputs();
    this.matchedCustomer = resolved;

    if (!resolved) {
      return;
    }

    if (source === 'phone' && !this.customerName.trim()) {
      this.customerName = resolved.name;
    }

    if (source === 'name' && !this.customerPhone.trim()) {
      this.customerPhone = resolved.phone;
    }
  }

  private resolveCustomerByInputs(): CustomerItem | null {
    const phone = this.customerPhone.trim();
    if (phone) {
      const byPhone = this.customerService.findByPhone(phone);
      if (byPhone) {
        return byPhone;
      }
    }

    const name = this.customerName.trim();
    if (!name) {
      return null;
    }

    return this.customerService.findByName(name);
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
