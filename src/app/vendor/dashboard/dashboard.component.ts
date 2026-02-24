import { Component } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { DashboardService, Product } from '../services/dashboard.service';

type DashboardVM = {
  sales: number;
  bills: number;
  lowStock: Product[];
  expiryWarnings: Product[];
  outOfStockCount: number;
  lowStockCount: number;
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
  currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  constructor(private dashboard: DashboardService) {
    this.vm$ = combineLatest({
      sales: this.dashboard.getTodaysSales$().pipe(startWith(0)),
      bills: this.dashboard.getTotalBills$().pipe(startWith(0)),
      lowStock: this.dashboard.getLowStockAlerts$(5).pipe(startWith([] as Product[])),
      expiryWarnings: this.dashboard.getExpiryWarnings$(30).pipe(startWith([] as Product[]))
    }).pipe(
      map((vm) => {
        const outOfStockCount = vm.lowStock.filter((item) => item.qty === 0).length;
        const lowStockCount = vm.lowStock.filter((item) => item.qty > 0).length;

        return {
          ...vm,
          outOfStockCount,
          lowStockCount
        };
      })
    );
  }

  trackByProductId(_index: number, item: Product) {
    return item.id;
  }
}