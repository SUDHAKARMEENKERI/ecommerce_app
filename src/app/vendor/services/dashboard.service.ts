
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Product = {
  id: string;
  name: string;
  qty: number;
  exp: string; // ISO date
};

export type InvoiceItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  itemCount: number;
  lineItems?: any[];
  date: string;
  invoiceNumber?: string;
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiBase = environment.apiBaseUrl;
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);

  private readonly allMedicines$ = this.refreshTrigger$.pipe(
    switchMap(() => this.http.get<any>(`${this.apiBase}/api/medicine/all`, {
      params: this.getBillingApiParams()
    })),
    map((response: any) => {
      let arr: any[] = [];
      if (Array.isArray(response)) arr = response;
      else if (response && Array.isArray(response.data)) arr = response.data;
      else if (response && Array.isArray(response.medicines)) arr = response.medicines;
      else for (const key in response) if (Array.isArray(response[key])) { arr = response[key]; break; }
      return arr.map((item: any) => ({
        id: item.id || item._id || '',
        name: item.name || '',
        qty: item.quantity ?? item.qty ?? 0,
        exp: item.expiry || item.exp || ''
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private readonly allInvoices$ = this.refreshTrigger$.pipe(
    switchMap(() => this.http.get<any>(`${this.apiBase}/api/billing`, {
      params: this.getBillingApiParams()
    })),
    map((response: any) => {
      let arr: any[] = [];
      if (Array.isArray(response)) arr = response;
      else if (response && Array.isArray(response.data)) arr = response.data;
      else if (response && Array.isArray(response.invoices)) arr = response.invoices;
      else for (const key in response) if (Array.isArray(response[key])) { arr = response[key]; break; }
      const mapped = arr.map((item: any) => ({
        id: item.id || item._id || '',
        customerName: item.customerName || '',
        customerPhone: item.customerPhone || '',
        amount: item.amount || 0,
        itemCount: item.itemCount || 0,
        lineItems: item.lineItems || [],
        date: item.date || '',
        invoiceNumber: item.invoiceNumber || ''
      }));
      return mapped;
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  constructor(private http: HttpClient) {}

  refreshDashboardData(): void {
    this.refreshTrigger$.next(undefined);
  }

  // Fetch all medicines from backend with params
  getAllMedicines$(): Observable<Product[]> {
    return this.allMedicines$;
  }

  // Stock metrics: out of stock, low stock, expiring soon
  getStockMetrics$(): Observable<{ outOfStock: number; lowStock: number; expiringSoon: number; }> {
    return this.getAllMedicines$().pipe(
      map((medicines) => {
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        let outOfStock = 0, lowStock = 0, expiringSoon = 0;
        for (const m of medicines) {
          if (m.qty === 0) outOfStock++;
          else if (m.qty > 0 && m.qty <= 5) lowStock++;
          if (m.exp && new Date(m.exp) <= in30Days) expiringSoon++;
        }
        return { outOfStock, lowStock, expiringSoon };
      })
    );
  }

  // Helper to get billing API params from localStorage
  private getBillingApiParams(): any {
    let storeId = '';
    let storeMobile = '';
    let email = '';
    const loginDataRaw = localStorage.getItem('vendor_login_response');
    if (loginDataRaw) {
      try {
        const loginData = JSON.parse(loginDataRaw);
        storeId = loginData.storeId || '';
        storeMobile = loginData.storeMobile || '';
        email = loginData.email || '';
      } catch (e) {
        console.warn('Failed to parse loginData from localStorage:', e);
      }
    }
    if (!storeId) storeId = localStorage.getItem('storeId') || '';
    if (!storeMobile) storeMobile = localStorage.getItem('storeMobile') || '';
    if (!email) email = localStorage.getItem('email') || '';
    const params: any = {};
    if (storeId) params.storeId = storeId;
    if (storeMobile) params.storeMobile = storeMobile;
    if (email) params.email = email;
    return params;
  }

  // Fetch all invoices (sales) from billing API with params
  getAllInvoices$(): Observable<InvoiceItem[]> {
    return this.allInvoices$;
  }

  // Recent sales (latest N invoices)
  getRecentInvoices$(count = 4): Observable<InvoiceItem[]> {
    return this.getAllInvoices$().pipe(
      map(invoices => invoices.slice(0, count))
    );
  }

  // Total sales amount
  getTotalSales$(): Observable<number> {
    return this.getAllInvoices$().pipe(
      map(invoices => invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))
    );
  }

  // Total number of sales (bills)
  getTotalBills$(): Observable<number> {
    return this.getAllInvoices$().pipe(
      map(invoices => invoices.length)
    );
  }
}
