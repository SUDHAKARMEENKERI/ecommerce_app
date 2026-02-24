import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerItem, CustomerService } from '../services/customer.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';

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

  constructor(private customerService: CustomerService, private invoiceService: InvoiceService) {
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

  refreshCustomers() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    setTimeout(() => {
      this.customers = this.customerService.getCustomers();
      this.isRefreshing = false;
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
    }, 700);
  }

  trackByCustomerId(_index: number, item: CustomerItem) {
    return item.id;
  }
}
