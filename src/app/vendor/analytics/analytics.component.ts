import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';

type AnalyticsTransaction = {
  id: string;
  title: string;
  amount: number;
  date: string;
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
  private destroyRef = inject(DestroyRef);

  fromDate = '';
  toDate = '';
  activeRange: RangeKey | null = null;
  invoices: InvoiceItem[] = [];
  transactions: AnalyticsTransaction[] = [];

  constructor() {
    this.invoiceService.invoices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.invoices = items;
        this.updateTransactions();
      });
  }

  get filteredInvoices(): InvoiceItem[] {
    const from = this.parseDate(this.fromDate);
    const to = this.parseDate(this.toDate);

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

  get trendBars(): number[] {
    const points = [0, 0, 0, 0, 0, 0, 0];

    this.filteredInvoices.forEach((item) => {
      const amount = item.amount;
      const dayIndex = this.resolveItemDate(item.date).getDay();
      points[dayIndex] += amount;
    });

    const max = Math.max(...points, 0);
    if (max === 0) {
      return [24, 20, 28, 22, 18, 26, 24];
    }

    return points.map((value) => Math.max(16, Math.round((value / max) * 100)));
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

  private getSortDate(item: InvoiceItem): number {
    return this.resolveItemDate(item.date).getTime();
  }

  private updateTransactions() {
    this.transactions = [...this.filteredInvoices]
      .sort((left, right) => this.getSortDate(right) - this.getSortDate(left))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: `${item.customerName} · ${item.customerPhone}`,
        amount: item.amount,
        date: item.date
      }));
  }

  private resolveItemDate(value: string): Date {
    return new Date(value);
  }

  private parseDate(value: string): Date | null {
    if (!value || !value.trim()) {
      return null;
    }

    const normalized = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const parsed = new Date(`${normalized}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(normalized)) {
      const [day, month, year] = normalized.split('-');
      const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
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
}
