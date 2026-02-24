import { Injectable } from '@angular/core';
import { interval, map, Observable, of } from 'rxjs';

export type Product = {
  id: string;
  name: string;
  qty: number;
  exp: string; // ISO date
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // sample product data to simulate inventory
  private products: Product[] = [
    { id: 'p1', name: 'Paracetamol 500mg', qty: 12, exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString() },
    { id: 'p2', name: 'Amoxicillin 250mg', qty: 3, exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString() },
    { id: 'p3', name: 'Cough Syrup', qty: 0, exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString() },
    { id: 'p4', name: 'Insulin', qty: 5, exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString() }
  ];

  // Simulate today's sales as a stream that updates every 5 seconds
  getTodaysSales$(): Observable<number> {
    return interval(5000).pipe(
      map((tick) => {
        // simple deterministic growth for demo
        return 2500 + tick * 10 + this.products.reduce((s, p) => s + (p.qty === 0 ? 0 : 0), 0);
      })
    );
  }

  // Simulate total bills count updating every 7 seconds
  getTotalBills$(): Observable<number> {
    return interval(7000).pipe(
      map((tick) => 120 + tick)
    );
  }

  // Low stock alerts (qty <= threshold)
  getLowStockAlerts$(threshold = 5): Observable<Product[]> {
    // evaluate every 6 seconds
    return interval(6000).pipe(
      map(() => this.products.filter((p) => p.qty <= threshold))
    );
  }

  // Expiry warnings (expiring within days)
  getExpiryWarnings$(days = 30): Observable<Product[]> {
    const ms = days * 24 * 60 * 60 * 1000;
    return interval(8000).pipe(
      map(() => {
        const now = Date.now();
        return this.products.filter((p) => new Date(p.exp).getTime() - now <= ms);
      })
    );
  }
}
