 

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
      recentInvoices: this.dashboard.getRecentInvoices$().pipe(startWith([] as InvoiceItem[]))
    }).pipe(
      map(({ totalSales, totalBills, stock, allMedicines, lowStockItems, recentInvoices }) => ({
        totalSales,
        totalBills,
        outOfStock: stock.outOfStock,
        lowStock: stock.lowStock,
        expiringSoon: stock.expiringSoon,
        totalMedicines: allMedicines.length,
        lowStockItems,
        recentInvoices
      }))
    );
  }

  trackByProductId(_index: number, item: Product) {
    return item.id;
  }

  trackByInvoiceId(_index: number, item: InvoiceItem) {
    return item.id;
  }
  
}