 

import { Component } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, map, startWith } from 'rxjs';
import { DashboardService, Product, InvoiceItem } from '../services/dashboard.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { Router } from '@angular/router';

type DashboardVM = {
  totalSales: number;
  totalBills: number;
  outOfStock: number;
  lowStock: number;
  expiringSoon: number;
  totalMedicines: number;
  lowStockItems: Product[];
  recentInvoices: InvoiceItem[];
  weeklyRevenue: { label: string; amount: number; height: number; isPeak: boolean }[];
};

type RevenueRange = 'today' | 'lastWeek' | 'month';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class VendorDashboardComponent {
  vm$!: Observable<DashboardVM>;
  readonly revenueGridRows = [0, 1, 2, 3, 4];
  selectedRevenueRange: RevenueRange = 'lastWeek';

  private readonly revenueRangeSubject = new BehaviorSubject<RevenueRange>('lastWeek');

  private readonly chartWidth = 600;
  private readonly chartLeft = 20;
  private readonly chartRight = 580;
  private readonly chartTop = 16;
  private readonly chartBottom = 184;
  


  constructor(
    private dashboard: DashboardService,
    private router: Router
  ) {
    this.vm$ = combineLatest({
      totalSales: this.dashboard.getTotalSales$().pipe(startWith(0)),
      totalBills: this.dashboard.getTotalBills$().pipe(startWith(0)),
      stock: this.dashboard.getStockMetrics$().pipe(startWith({ outOfStock: 0, lowStock: 0, expiringSoon: 0 })),
      allMedicines: this.dashboard.getAllMedicines$().pipe(startWith([] as Product[])),
      lowStockItems: this.dashboard.getAllMedicines$().pipe(
        map(meds => meds.filter(m => m.qty > 0 && m.qty <= 5)),
        startWith([] as Product[])
      ),
      recentInvoices: this.dashboard.getRecentInvoices$().pipe(startWith([] as InvoiceItem[])),
      allInvoices: this.dashboard.getAllInvoices$().pipe(startWith([] as InvoiceItem[])),
      revenueRange: this.revenueRangeSubject.asObservable()
    }).pipe(
      map(({ totalSales, totalBills, stock, allMedicines, lowStockItems, recentInvoices, allInvoices, revenueRange }) => ({
        totalSales,
        totalBills,
        outOfStock: stock.outOfStock,
        lowStock: stock.lowStock,
        expiringSoon: stock.expiringSoon,
        totalMedicines: allMedicines.length,
        lowStockItems,
        recentInvoices,
        weeklyRevenue: this.buildRevenueSeries(allInvoices, revenueRange)
      }))
    );
  }

  private buildWeeklyRevenue(invoices: InvoiceItem[]): { label: string; amount: number; height: number; isPeak: boolean }[] {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      date.setHours(0, 0, 0, 0);

      return {
        date,
        label: dayLabels[date.getDay()],
        amount: 0
      };
    });

    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.date);
      if (Number.isNaN(invoiceDate.getTime())) {
        continue;
      }

      invoiceDate.setHours(0, 0, 0, 0);
      if (invoiceDate < startDate || invoiceDate > today) {
        continue;
      }

      const dayIndex = Math.floor((invoiceDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < days.length) {
        days[dayIndex].amount += Number(invoice.amount) || 0;
      }
    }

    const maxAmount = days.reduce((max, day) => Math.max(max, day.amount), 0);
    return days.map((day) => ({
      label: day.label,
      amount: day.amount,
      height: maxAmount > 0 ? Math.max((day.amount / maxAmount) * 100, day.amount > 0 ? 12 : 0) : 0,
      isPeak: maxAmount > 0 && day.amount === maxAmount
    }));
  }

  private buildTodayRevenue(invoices: InvoiceItem[]): { label: string; amount: number; height: number; isPeak: boolean }[] {
    const slots = [
      { label: '12a', startHour: 0, endHour: 4, amount: 0 },
      { label: '4a', startHour: 4, endHour: 8, amount: 0 },
      { label: '8a', startHour: 8, endHour: 12, amount: 0 },
      { label: '12p', startHour: 12, endHour: 16, amount: 0 },
      { label: '4p', startHour: 16, endHour: 20, amount: 0 },
      { label: '8p', startHour: 20, endHour: 24, amount: 0 }
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.date);
      if (Number.isNaN(invoiceDate.getTime())) {
        continue;
      }

      const invoiceDay = new Date(invoiceDate);
      invoiceDay.setHours(0, 0, 0, 0);
      if (invoiceDay.getTime() !== today.getTime()) {
        continue;
      }

      const hour = invoiceDate.getHours();
      const slot = slots.find((item) => hour >= item.startHour && hour < item.endHour);
      if (slot) {
        slot.amount += Number(invoice.amount) || 0;
      }
    }

    const maxAmount = slots.reduce((max, item) => Math.max(max, item.amount), 0);
    return slots.map((slot) => ({
      label: slot.label,
      amount: slot.amount,
      height: maxAmount > 0 ? Math.max((slot.amount / maxAmount) * 100, slot.amount > 0 ? 12 : 0) : 0,
      isPeak: maxAmount > 0 && slot.amount === maxAmount
    }));
  }

  private buildMonthRevenue(invoices: InvoiceItem[]): { label: string; amount: number; height: number; isPeak: boolean }[] {
    const weeks = [
      { label: 'W1', amount: 0 },
      { label: 'W2', amount: 0 },
      { label: 'W3', amount: 0 },
      { label: 'W4', amount: 0 }
    ];

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 27);

    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.date);
      if (Number.isNaN(invoiceDate.getTime())) {
        continue;
      }

      if (invoiceDate < startDate || invoiceDate > endDate) {
        continue;
      }

      const normalizedInvoiceDate = new Date(invoiceDate);
      normalizedInvoiceDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((normalizedInvoiceDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekIndex = Math.floor(diffDays / 7);

      if (weekIndex >= 0 && weekIndex < weeks.length) {
        weeks[weekIndex].amount += Number(invoice.amount) || 0;
      }
    }

    const maxAmount = weeks.reduce((max, week) => Math.max(max, week.amount), 0);
    return weeks.map((week) => ({
      label: week.label,
      amount: week.amount,
      height: maxAmount > 0 ? Math.max((week.amount / maxAmount) * 100, week.amount > 0 ? 12 : 0) : 0,
      isPeak: maxAmount > 0 && week.amount === maxAmount
    }));
  }

  private buildRevenueSeries(invoices: InvoiceItem[], range: RevenueRange): { label: string; amount: number; height: number; isPeak: boolean }[] {
    if (range === 'today') {
      return this.buildTodayRevenue(invoices);
    }

    if (range === 'month') {
      return this.buildMonthRevenue(invoices);
    }

    return this.buildWeeklyRevenue(invoices);
  }

  trackByProductId(_index: number, item: Product) {
    return item.id;
  }

  trackByInvoiceId(_index: number, item: InvoiceItem) {
    return item.id;
  }

  get revenueSubtitle(): string { 
    if (this.selectedRevenueRange === 'today') {
      return 'Hourly sales performance for today.';
    }

    if (this.selectedRevenueRange === 'month') {
      return 'Weekly sales performance for the last month.';
    }

    return 'Daily sales performance for the current week.';
  }

  onRevenueRangeChange(value: string) {
    if (value !== 'today' && value !== 'lastWeek' && value !== 'month') {
      return;
    }

    this.selectedRevenueRange = value;
    this.revenueRangeSubject.next(value);
  }

  goToPurchaseOrder() {
    this.router.navigate(['/vendor/purchase']);
  }

  getRevenueAxisTicks(points: { amount: number }[]): number[] {
    const maxValue = this.getRevenueMax(points);
    return [5, 4, 3, 2, 1].map((multiplier) => Math.round((maxValue * multiplier) / 5));
  }

  formatRevenueTick(value: number): string {
    if (value >= 1000) {
      return `₹${Math.round(value / 1000)}k`;
    }

    return `₹${Math.round(value)}`;
  }

  getRevenueGridY(index: number): number {
    const step = (this.chartBottom - this.chartTop) / (this.revenueGridRows.length - 1);
    return this.chartTop + step * index;
  }

  getRevenuePointX(index: number, totalPoints: number): number {
    if (totalPoints <= 1) {
      return (this.chartLeft + this.chartRight) / 2;
    }

    const step = (this.chartRight - this.chartLeft) / (totalPoints - 1);
    return this.chartLeft + step * index;
  }

  getRevenuePointY(amount: number, points: { amount: number }[]): number {
    const maxValue = this.getRevenueMax(points);
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const ratio = Math.min(safeAmount / maxValue, 1);

    return this.chartBottom - ratio * (this.chartBottom - this.chartTop);
  }

  buildRevenueLinePoints(points: { amount: number }[]): string {
    return points
      .map((point, index) => `${this.getRevenuePointX(index, points.length)},${this.getRevenuePointY(point.amount, points)}`)
      .join(' ');
  }

  buildRevenueAreaPath(points: { amount: number }[]): string {
    if (!points.length) {
      return '';
    }

    const linePath = points
      .map((point, index) => {
        const x = this.getRevenuePointX(index, points.length);
        const y = this.getRevenuePointY(point.amount, points);

        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const firstX = this.getRevenuePointX(0, points.length);
    const lastX = this.getRevenuePointX(points.length - 1, points.length);

    return `${linePath} L ${lastX} ${this.chartBottom} L ${firstX} ${this.chartBottom} Z`;
  }

  private getRevenueMax(points: { amount: number }[]): number {
    const maxPointAmount = points.reduce((max, point) => Math.max(max, Number(point.amount) || 0), 0);
    const roundedMax = Math.ceil(maxPointAmount / 1000) * 1000;

    return Math.max(roundedMax, 1000);
  }
  
}