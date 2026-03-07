import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { CustomerItem, CustomerService } from '../services/customer.service';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';
import { MedicineItem, MedicineService } from '../services/medicine.service';

type TopSellingMedicine = {
  name: string;
  subtitle: string;
  unitsSold: number;
  revenue: number;
  barWidth: number;
};

type ExpiryRiskItem = {
  name: string;
  batch: string;
  stock: number;
  expiry: string;
  daysLeft: number;
};

@Component({
  selector: 'app-vendor-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})

export class VendorReportsComponent {
  private invoiceService = inject(InvoiceService);
  private medicineService = inject(MedicineService);
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  invoices: InvoiceItem[] = [];
  medicines: MedicineItem[] = [];
  customers: CustomerItem[] = [];
  loadError = '';
  contextWarning = '';
  aiInsight = '';

  get warningMessage(): string {
    if (this.loadError) {
      return this.loadError;
    }

    return this.contextWarning;
  }

  get estimatedProfitThisMonth(): number {
    return this.thisMonthRevenue * 0.18;
  }

  get profitTrendPercent(): number {
    const prevProfit = this.lastMonthRevenue * 0.18;
    if (prevProfit <= 0) {
      return this.estimatedProfitThisMonth > 0 ? 100 : 0;
    }

    return ((this.estimatedProfitThisMonth - prevProfit) / prevProfit) * 100;
  }

  get averageOrderValue(): number {
    if (this.thisMonthInvoices.length === 0) {
      return 0;
    }

    return this.thisMonthRevenue / this.thisMonthInvoices.length;
  }

  get newCustomersThisMonth(): number {
    const monthStart = this.getMonthStart(new Date());
    const nextMonthStart = this.getNextMonthStart(monthStart);

    return this.customers.filter((customer) => {
      const visitDate = this.toValidDate(customer.lastVisit);
      return !!visitDate && visitDate >= monthStart && visitDate < nextMonthStart;
    }).length;
  }

  get newCustomersTrendPercent(): number {
    const thisMonthStart = this.getMonthStart(new Date());
    const lastMonthStart = this.getMonthStart(new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1));
    const thisMonthNext = this.getNextMonthStart(thisMonthStart);
    const lastMonthNext = thisMonthStart;

    const currentCount = this.customers.filter((customer) => {
      const visitDate = this.toValidDate(customer.lastVisit);
      return !!visitDate && visitDate >= thisMonthStart && visitDate < thisMonthNext;
    }).length;

    const previousCount = this.customers.filter((customer) => {
      const visitDate = this.toValidDate(customer.lastVisit);
      return !!visitDate && visitDate >= lastMonthStart && visitDate < lastMonthNext;
    }).length;

    if (previousCount <= 0) {
      return currentCount > 0 ? 100 : 0;
    }

    return ((currentCount - previousCount) / previousCount) * 100;
  }

  get topSellingMedicines(): TopSellingMedicine[] {
    const aggregate = new Map<string, { name: string; subtitle: string; unitsSold: number; revenue: number }>();

    for (const invoice of this.thisMonthInvoices) {
      const lineItems = invoice.lineItems ?? [];

      for (const lineItem of lineItems) {
        const name = lineItem.medicineName?.trim() || 'Unknown Medicine';
        const subtitle = lineItem.brand?.trim() || lineItem.composition?.trim() || 'NA';
        const unitsSold = Math.max(0, Number(lineItem.qty) || 0);
        const revenue = Math.max(
          0,
          Number(lineItem.total) || (Number(lineItem.unitPrice) || 0) * (Number(lineItem.qty) || 0)
        );

        const current = aggregate.get(name) ?? { name, subtitle, unitsSold: 0, revenue: 0 };
        current.unitsSold += unitsSold;
        current.revenue += revenue;
        if (!current.subtitle || current.subtitle === 'NA') {
          current.subtitle = subtitle;
        }
        aggregate.set(name, current);
      }
    }

    let rows = [...aggregate.values()]
      .sort((left, right) => right.unitsSold - left.unitsSold)
      .slice(0, 5);

    if (rows.length === 0 && this.thisMonthInvoices.length > 0) {
      rows = [
        {
          name: 'Mixed Medicines',
          subtitle: 'Based on invoice totals',
          unitsSold: this.thisMonthInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.itemCount || 0), 0),
          revenue: this.thisMonthRevenue
        }
      ];
    }

    const maxUnits = Math.max(...rows.map((row) => row.unitsSold), 0);

    return rows.map((row) => ({
      ...row,
      barWidth: maxUnits > 0 ? Math.max(14, Math.round((row.unitsSold / maxUnits) * 100)) : 14
    }));
  }

  get expiryRiskItems(): ExpiryRiskItem[] {
    const now = this.startOfDay(new Date());
    const in90Days = this.startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90));

    return this.medicines
      .map((medicine) => {
        const expiryDate = this.toValidDate(medicine.expiry);
        if (!expiryDate) {
          return null;
        }

        const normalizedExpiry = this.startOfDay(expiryDate);
        const daysLeft = Math.ceil((normalizedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0 || normalizedExpiry > in90Days) {
          return null;
        }

        return {
          name: medicine.name,
          batch: medicine.batch,
          stock: Math.max(0, medicine.quantity),
          expiry: medicine.expiry,
          daysLeft
        } as ExpiryRiskItem;
      })
      .filter((item): item is ExpiryRiskItem => !!item)
      .sort((left, right) => left.daysLeft - right.daysLeft)
      .slice(0, 5);
  }

  get expiryRiskCount(): number {
    return this.expiryRiskItems.length;
  }

  private get thisMonthInvoices(): InvoiceItem[] {
    const monthStart = this.getMonthStart(new Date());
    const nextMonthStart = this.getNextMonthStart(monthStart);

    return this.invoices.filter((invoice) => {
      const invoiceDate = this.toValidDate(invoice.date);
      return !!invoiceDate && invoiceDate >= monthStart && invoiceDate < nextMonthStart;
    });
  }

  private get thisMonthRevenue(): number {
    return this.thisMonthInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount), 0);
  }

  private get lastMonthRevenue(): number {
    const thisMonthStart = this.getMonthStart(new Date());
    const lastMonthStart = this.getMonthStart(new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1));

    return this.invoices
      .filter((invoice) => {
        const invoiceDate = this.toValidDate(invoice.date);
        return !!invoiceDate && invoiceDate >= lastMonthStart && invoiceDate < thisMonthStart;
      })
      .reduce((sum, invoice) => sum + Math.max(0, invoice.amount), 0);
  }

  constructor() {
    this.invoiceService.invoices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.invoices = items;
      });

    this.medicineService.medicines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.medicines = items;
      });

    this.customerService.customers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.customers = items;
      });

    this.loadReportData();
  }

  exportCsv() {
    const headers = ['Invoice ID', 'Date', 'Customer Name', 'Customer Phone', 'Amount', 'Item Count'];
    const rows = this.thisMonthInvoices.map((invoice) => [
      invoice.invoiceNumber || invoice.id,
      invoice.date,
      invoice.customerName,
      invoice.customerPhone,
      String(Math.max(0, invoice.amount)),
      String(Math.max(0, invoice.itemCount || 0))
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'monthly_reports.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  generateAiInsight() {
    const lowStockCount = this.medicines.filter((item) => item.status === 'Low Stock').length;
    const expiringSoonCount = this.expiryRiskItems.length;

    if (this.thisMonthRevenue <= 0) {
      this.aiInsight = 'No billing records found for this month yet. Generate a few invoices to unlock insights.';
      return;
    }

    this.aiInsight = `This month revenue is ₹${Math.round(this.thisMonthRevenue).toLocaleString('en-IN')}. Top risk signals: ${expiringSoonCount} medicines expiring in 90 days and ${lowStockCount} low-stock items.`;
  }

  private loadReportData() {
    this.loadError = '';
    this.contextWarning = '';

    const context = this.getStoreContext();
    if (!context.storeId || !context.storeMobile || !context.email) {
      this.contextWarning =
        'Store login context is incomplete. Customer and billing filters may return empty data.';
    }

    const invoices$ = this.invoiceService.loadInvoicesFromApi().pipe(
      catchError(() => {
        this.loadError = 'Unable to load billing data for reports.';
        return of([] as InvoiceItem[]);
      })
    );

    const medicines$ = this.medicineService.loadMedicinesFromApi().pipe(catchError(() => of([] as MedicineItem[])));

    const customers$ = context.email && context.storeMobile && context.storeId
      ? this.customerService
          .loadCustomers({
            email: context.email,
            storeMobile: context.storeMobile,
            storeId: context.storeId
          })
          .pipe(catchError(() => of([] as CustomerItem[])))
      : of([] as CustomerItem[]);

    forkJoin([invoices$, medicines$, customers$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private getStoreContext(): { email: string; storeMobile: string; storeId: string } {
    const source = this.extractSource(this.authService.loginResponse);

    return {
      email: this.pickValue(source, ['email', 'mailId', 'storeEmail']),
      storeMobile: this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']),
      storeId: this.pickValue(source, ['id', 'storeId', 'medicalStoreId', 'pharmacyCode'])
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

  private toValidDate(value: string): Date | null {
    if (!value || !value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private getMonthStart(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
  }

  private getNextMonthStart(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  private startOfDay(value: Date): Date {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  }
}
