import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerItem, CustomerService } from '../services/customer.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';
import { AuthService } from '../../shared/services/auth.service';

type CustomerFilter = 'Top Spenders' | 'Most Visits' | 'Recent';

@Component({
  selector: 'app-vendor-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class VendorCustomersComponent {
  private destroyRef = inject(DestroyRef);

  filterTabs: CustomerFilter[] = ['Top Spenders', 'Most Visits', 'Recent'];
  activeFilter: CustomerFilter = 'Top Spenders';
  searchText = '';
  customers: CustomerItem[] = [];
  invoices: InvoiceItem[] = [];
  isRefreshing = false;
  pageSize = 4;
  currentPage = 1;
  selectedCustomer: CustomerItem | null = null;
  isAddModalOpen = false;
  isSavingCustomer = false;
  addCustomerMessage = '';
  addCustomerMessageType: 'success' | 'error' = 'success';
  addForm = {
    name: '',
    phone: '',
    gender: 'Male',
    age: '',
    doctorName: '',
    referredBy: 'Direct'
  };

  constructor(
    private customerService: CustomerService,
    private invoiceService: InvoiceService,
    private authService: AuthService
  ) {
    this.customerService.customers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((customers) => {
        this.customers = customers;
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      });

    this.invoiceService.invoices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((invoices) => {
        this.invoices = invoices;
      });

    this.fetchCustomersFromApi();
  }

  get totalCustomers(): number {
    return this.customers.length;
  }

  get totalRevenue(): number {
    return this.customers.reduce((sum, item) => sum + item.totalSpent, 0);
  }

  get averageVisits(): number {
    if (this.customers.length === 0) {
      return 0;
    }

    return this.customers.reduce((sum, item) => sum + item.visits, 0) / this.customers.length;
  }

  get visibleCustomers(): CustomerItem[] {
    const query = this.searchText.trim().toLowerCase();
    const filtered = this.customers.filter((item) => {
      if (!query) {
        return true;
      }

      return [item.name, item.phone].join(' ').toLowerCase().includes(query);
    });

    return [...filtered].sort((left, right) => {
      if (this.activeFilter === 'Most Visits') {
        return right.visits - left.visits;
      }

      if (this.activeFilter === 'Recent') {
        return new Date(right.lastVisit).getTime() - new Date(left.lastVisit).getTime();
      }

      return right.totalSpent - left.totalSpent;
    });
  }

  get pagedCustomers(): CustomerItem[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.visibleCustomers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visibleCustomers.length / this.pageSize));
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  get activePageCount(): number {
    return this.pagedCustomers.length;
  }

  get selectedCustomerInvoices(): InvoiceItem[] {
    if (!this.selectedCustomer) {
      return [];
    }

    return this.invoices
      .filter((invoice) => invoice.customerPhone === this.selectedCustomer?.phone)
      .slice(0, 5);
  }

  setFilter(tab: CustomerFilter) {
    this.activeFilter = tab;
    this.currentPage = 1;
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  goToPreviousPage() {
    if (!this.canGoPrevious) {
      return;
    }

    this.currentPage -= 1;
  }

  goToNextPage() {
    if (!this.canGoNext) {
      return;
    }

    this.currentPage += 1;
  }

  openCustomer(customer: CustomerItem) {
    this.selectedCustomer = customer;
  }

  closeCustomerDrawer() {
    this.selectedCustomer = null;
  }

  openAddCustomerModal() {
    this.isAddModalOpen = true;
    this.addCustomerMessage = '';
  }

  closeAddCustomerModal() {
    this.isAddModalOpen = false;
    this.resetAddForm();
  }

  onAddCustomerPhoneInput(value: string) {
    this.addForm.phone = value.replace(/\D/g, '').slice(0, 10);
  }

  onAddCustomerAgeInput(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      this.addForm.age = '';
      return;
    }

    this.addForm.age = String(Math.min(120, Number(digits)));
  }

  saveCustomerProfile() {
    if (this.isSavingCustomer) {
      return;
    }

    try {
      const ageDigits = this.addForm.age.replace(/\D/g, '');
      const age = ageDigits;

      const storeDetails = this.getMedicalStoreDetails();

      if (!this.addForm.name.trim() || !this.addForm.phone.trim() || !age) {
        this.showAddCustomerMessage('Name, phone, and age are required.', 'error');
        return;
      }

      if (this.addForm.phone.trim().length !== 10) {
        this.showAddCustomerMessage('Mobile number must be 10 digits.', 'error');
        return;
      }

      if (!storeDetails.email || !storeDetails.storeMobile || !storeDetails.storeId) {
        this.showAddCustomerMessage('Store account details are missing. Please login again.', 'error');
        return;
      }

      this.isSavingCustomer = true;

      this.customerService
        .addCustomerProfile({
          name: this.addForm.name,
          phone: this.addForm.phone,
          gender: this.addForm.gender,
          age,
          doctorName: this.addForm.doctorName,
          referredBy: this.addForm.referredBy,
          ...storeDetails
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showAddCustomerMessage('Customer profile added successfully.', 'success');
            this.isSavingCustomer = false;

            setTimeout(() => {
              this.closeAddCustomerModal();
            }, 650);
          },
          error: () => {
            this.isSavingCustomer = false;
            this.showAddCustomerMessage('Failed to save customer profile. Please try again.', 'error');
          }
        });
    } catch {
      this.showAddCustomerMessage('Please fill all required profile fields.', 'error');
    }
  }

  refreshCustomers() {
    this.fetchCustomersFromApi();
  }

  private showAddCustomerMessage(message: string, type: 'success' | 'error') {
    this.addCustomerMessage = message;
    this.addCustomerMessageType = type;
  }

  private resetAddForm() {
    this.addForm = {
      name: '',
      phone: '',
      gender: 'Male',
      age: '',
      doctorName: '',
      referredBy: 'Direct'
    };
    this.addCustomerMessage = '';
    this.isSavingCustomer = false;
  }

  trackByCustomerId(_index: number, item: CustomerItem) {
    return item.id;
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
      storeId: this.pickValue(source, ['id', 'storeId'])
    };
  }

  private fetchCustomersFromApi() {
    if (this.isRefreshing) {
      return;
    }

    const storeDetails = this.getMedicalStoreDetails();
    if (!storeDetails.email || !storeDetails.storeMobile || !storeDetails.storeId) {
      this.customers = [];
      return;
    }

    this.isRefreshing = true;

    this.customerService
      .loadCustomers(storeDetails)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isRefreshing = false;
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }
        },
        error: () => {
          this.isRefreshing = false;
          this.showAddCustomerMessage('Failed to load customers.', 'error');
        }
      });
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
