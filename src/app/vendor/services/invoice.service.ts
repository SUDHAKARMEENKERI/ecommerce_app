import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

export type InvoiceLineItem = {
  medicineName: string;
  brand: string;
  composition: string;
  batch: string;
  qty: number;
  unitPrice: number;
  total: number;
};

export type InvoiceItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  patientGender?: string;
  patientAge?: string;
  doctorName?: string;
  referredBy?: string;
  amount: number;
  itemCount: number;
  lineItems?: InvoiceLineItem[];
  date: string;
  invoiceNumber?: string; // Added field
};

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly invoicesSubject = new BehaviorSubject<InvoiceItem[]>([]);
  invoices$: Observable<InvoiceItem[]> = this.invoicesSubject.asObservable();
  private readonly billingApiBaseUrl = `${environment.apiBaseUrl}/api/billing`;

  constructor(private http: HttpClient, private authService: AuthService, private notificationService: NotificationService) {}

  getInvoices(): InvoiceItem[] {
    return this.invoicesSubject.getValue().map((item) => ({ ...item }));
  }

  createInvoiceViaApi(input: Omit<InvoiceItem, 'id'>): Observable<InvoiceItem> {
    // Get login data from AuthService
    const loginResponse: any = this.authService.loginResponse;
    const storeId = loginResponse?.storeId || '';
    const storeMobile = loginResponse?.storeMobile || '';
    const email = loginResponse?.email || '';
    // Merge billing fields
    const payload = {
      ...input,
      storeId,
      storeMobile,
      email
    };
    return this.http.post<unknown>(`${this.billingApiBaseUrl}`, payload).pipe(
      map((response: any) => this.mapInvoiceResponse(response)),
      tap((invoice) => this.upsertInvoice(invoice))
    );
  }

  loadInvoicesFromApi(): Observable<InvoiceItem[]> {
    const params = this.getBillingApiParams();

    return this.http.get<unknown>(`${this.billingApiBaseUrl}`, { params }).pipe(
      map((response: any) => this.mapInvoiceList(response)),
      tap((invoices) => this.invoicesSubject.next(invoices)),
      catchError((error) => {
        this.notificationService.errorOnce(
          'invoice-sync-error',
          'API Sync Error',
          'Failed to sync invoices from server.'
        );
        return throwError(() => error);
      })
    );
  }

  private getBillingApiParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const source = this.extractSource(this.authService.loginResponse);

    const storeId = this.pickValue(source, ['storeId', 'medicalStoreId', 'pharmacyCode']) || localStorage.getItem('storeId') || '';
    const storeMobile =
      this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']) || localStorage.getItem('storeMobile') || '';
    const email = this.pickValue(source, ['email', 'mailId', 'storeEmail']) || localStorage.getItem('email') || '';

    if (storeId) {
      params['storeId'] = storeId;
    }

    if (storeMobile) {
      params['storeMobile'] = storeMobile;
    }

    if (email) {
      params['email'] = email;
    }

    return params;
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

  private upsertInvoice(invoice: InvoiceItem) {
    const current = this.invoicesSubject.getValue();
    this.invoicesSubject.next([invoice, ...current.filter(i => i.id !== invoice.id)]);
  }

  private mapInvoiceResponse(response: any): InvoiceItem {
    // Map backend response to InvoiceItem
    return {
      id: response.id || response._id || '',
      customerName: response.customerName || '',
      customerPhone: response.customerPhone || '',
      patientGender: response.patientGender || '',
      patientAge: response.patientAge || '',
      doctorName: response.doctorName || '',
      referredBy: response.referredBy || '',
      amount: response.amount || 0,
      itemCount: response.itemCount || 0,
      lineItems: response.lineItems || [],
      date: response.date || '',
      invoiceNumber: response.invoiceNumber || '' // Added field
    };
  }

  private mapInvoiceList(response: any): InvoiceItem[] {
    let arr: any[] = [];
    if (Array.isArray(response)) {
      arr = response;
    } else if (response && Array.isArray(response.data)) {
      arr = response.data;
    } else if (response && Array.isArray(response.invoices)) {
      arr = response.invoices;
    } else {
      // Try to find the first array property in the response
      for (const key in response) {
        if (Array.isArray(response[key])) {
          arr = response[key];
          break;
        }
      }
    }
    return arr.map((item: any) => this.mapInvoiceResponse(item));
  }
}
