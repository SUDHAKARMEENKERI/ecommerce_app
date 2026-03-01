 

import { Component } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { DashboardService, Product, InvoiceItem } from '../services/dashboard.service';
import { HeaderComponent } from '../../shared/header/header.component';

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

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class VendorDashboardComponent {
  vm$!: Observable<DashboardVM>;
  


  constructor(private dashboard: DashboardService) {
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
      allInvoices: this.dashboard.getAllInvoices$().pipe(startWith([] as InvoiceItem[]))
    }).pipe(
      map(({ totalSales, totalBills, stock, allMedicines, lowStockItems, recentInvoices, allInvoices }) => ({
        totalSales,
        totalBills,
        outOfStock: stock.outOfStock,
        lowStock: stock.lowStock,
        expiringSoon: stock.expiringSoon,
        totalMedicines: allMedicines.length,
        lowStockItems,
        recentInvoices,
        weeklyRevenue: this.buildWeeklyRevenue(allInvoices)
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

  trackByProductId(_index: number, item: Product) {
    return item.id;
  }

  trackByInvoiceId(_index: number, item: InvoiceItem) {
    return item.id;
  }
  
}