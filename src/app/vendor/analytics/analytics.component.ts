import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';
import { MedicineService } from '../services/medicine.service';
import { CustomerService } from '../services/customer.service';
import { AuthService } from '../../shared/services/auth.service';
import { catchError, forkJoin, of } from 'rxjs';
import { Router } from '@angular/router';

type AnalyticsTransaction = {
  id: string;
  title: string;
  amount: number;
  date: string;
};

type TrendPoint = {
  label: string;
  amount: number;
  height: number;
};

type RangeKey = 'today' | '7d' | '30d' | 'month';

@Component({
  selector: 'app-vendor-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class VendorAnalyticsComponent {
  private invoiceService = inject(InvoiceService);
  private medicineService = inject(MedicineService);
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  fromDate = '';
  toDate = '';
  activeRange: RangeKey | null = null;
  invoices: InvoiceItem[] = [];
  transactions: AnalyticsTransaction[] = [];
  loadError = '';
  contextWarning = '';

  get warningMessage(): string {
    if (this.loadError) {
      return this.loadError;
    }

    return this.contextWarning;
  }

  get visibleTransactions(): AnalyticsTransaction[] {
    return this.transactions.slice(0, 5);
  }

  constructor() {
    this.invoiceService.invoices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.invoices = items;
        this.updateTransactions();
      });

    this.loadAnalyticsData();
  }

  get filteredInvoices(): InvoiceItem[] {
    const from = this.parseDate(this.fromDate);
    const to = this.parseDate(this.toDate, true);

    return this.invoices.filter((item) => {
      const itemDate = this.resolveItemDate(item.date);
      const afterFrom = !from || itemDate >= from;
      const beforeTo = !to || itemDate <= to;
      return afterFrom && beforeTo;
    });
  }

  get totalRevenue(): number {
    return this.filteredInvoices.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalInvoices(): number {
    return this.filteredInvoices.length;
  }

  get averageValue(): number {
    if (this.filteredInvoices.length === 0) {
      return 0;
    }

    return this.totalRevenue / this.filteredInvoices.length;
  }

  get trendSeries(): TrendPoint[] {
    const range = this.getTrendRange();
    const dates = this.buildDateSeries(range.from, range.to);
    const salesByDate = new Map<string, number>();

    dates.forEach((dateItem) => {
      salesByDate.set(this.formatDateKey(dateItem), 0);
    });

    this.invoices.forEach((invoice) => {
      const invoiceDate = this.resolveItemDate(invoice.date);
      if (invoiceDate < range.from || invoiceDate > range.to) {
        return;
      }

      const key = this.formatDateKey(invoiceDate);
      if (!salesByDate.has(key)) {
        return;
      }

      const current = salesByDate.get(key) ?? 0;
      salesByDate.set(key, current + Math.max(0, invoice.amount));
    });

    const values = dates.map((dateItem) => salesByDate.get(this.formatDateKey(dateItem)) ?? 0);
    const maxValue = Math.max(...values, 0);

    return dates.map((dateItem, index) => {
      const amount = values[index];
      const height = maxValue > 0 ? Math.round((amount / maxValue) * 100) : 0;
      return {
        label: this.formatTrendLabel(dateItem),
        amount,
        height
      };
    });
  }

  onDateFilterChange() {
    this.activeRange = null;
    this.updateTransactions();
  }

  applyQuickRange(range: RangeKey) {
    const now = new Date();
    let from = new Date(now);

    if (range === 'today') {
      from = new Date(now);
    } else if (range === '7d') {
      from.setDate(now.getDate() - 6);
    } else if (range === '30d') {
      from.setDate(now.getDate() - 29);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    this.fromDate = this.formatDateInput(from);
    this.toDate = this.formatDateInput(now);
    this.activeRange = range;
    this.updateTransactions();
  }

  clearFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.activeRange = null;
    this.updateTransactions();
  }

  viewAllTransactions() {
    this.router.navigate(['/vendor/billing']);
  }

  private getSortDate(item: InvoiceItem): number {
    return this.resolveItemDate(item.date).getTime();
  }

  private updateTransactions() {
    this.transactions = [...this.filteredInvoices]
      .sort((left, right) => this.getSortDate(right) - this.getSortDate(left))
      .map((item) => ({
        id: item.id,
        title: `${item.customerName} · ${item.customerPhone}`,
        amount: item.amount,
        date: item.date
      }));
  }

  private resolveItemDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(0);
    }

    return parsed;
  }

  private parseDate(value: string, endOfDay = false): Date | null {
    if (!value || !value.trim()) {
      return null;
    }

    const normalized = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const parsed = new Date(`${normalized}${endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(normalized)) {
      const [day, month, year] = normalized.split('-');
      const parsed = new Date(`${year}-${month}-${day}${endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private formatDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getTrendRange(): { from: Date; to: Date } {
    const parsedFrom = this.parseDate(this.fromDate);
    const parsedTo = this.parseDate(this.toDate, true);

    if (parsedFrom && parsedTo) {
      return parsedFrom <= parsedTo
        ? { from: parsedFrom, to: parsedTo }
        : { from: this.startOfDay(parsedTo), to: this.endOfDay(parsedFrom) };
    }

    if (parsedFrom && !parsedTo) {
      return { from: parsedFrom, to: this.endOfDay(new Date()) };
    }

    if (!parsedFrom && parsedTo) {
      const from = this.startOfDay(new Date(parsedTo));
      from.setDate(from.getDate() - 6);
      return { from, to: parsedTo };
    }

    const today = new Date();
    const to = this.endOfDay(today);
    const from = this.startOfDay(new Date(today));
    from.setDate(from.getDate() - 6);
    return { from, to };
  }

  private buildDateSeries(from: Date, to: Date): Date[] {
    const dates: Date[] = [];
    const cursor = this.startOfDay(new Date(from));
    const end = this.endOfDay(new Date(to));

    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  private formatDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTrendLabel(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = value.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
  }

  private startOfDay(value: Date): Date {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(value: Date): Date {
    const next = new Date(value);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private loadAnalyticsData() {
    this.loadError = '';
    this.contextWarning = '';

    const context = this.getStoreContext();

    if (!context.storeId || !context.storeMobile || !context.email) {
      this.contextWarning =
        'Store login context is incomplete. Billing/Customer API filters may return empty analytics data.';
    }

    const invoices$ = this.invoiceService.loadInvoicesFromApi().pipe(
      catchError(() => {
        this.loadError = 'Unable to load billing data from API.';
        return of([] as InvoiceItem[]);
      })
    );

    const medicines$ = this.medicineService.loadMedicinesFromApi().pipe(catchError(() => of([])));

    const customers$ = context.email && context.storeMobile && context.storeId
      ? this.customerService
          .loadCustomers({
            email: context.email,
            storeMobile: context.storeMobile,
            storeId: context.storeId
          })
          .pipe(catchError(() => of([])))
      : of([]);

    forkJoin([invoices$, medicines$, customers$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private getStoreContext(): { email: string; storeMobile: string; storeId: string } {
    const source = this.extractSource(this.authService.loginResponse);

    return {
      email: this.pickValue(source, ['email', 'mailId', 'storeEmail']),
      storeMobile: this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']),
      storeId: this.pickValue(source, ['storeId', 'medicalStoreId', 'pharmacyCode'])
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

    if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
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
