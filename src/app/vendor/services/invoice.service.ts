import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/services/auth.service';

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

  constructor(private http: HttpClient, private authService: AuthService) {}

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
    // Get login data from localStorage (assuming login data is stored as JSON string)
    let loginDataRaw = localStorage.getItem('vendor_login_response');
    let storeId = '';
    let storeMobile = '';
    let email = '';
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
    // Fallback to direct keys if loginData is not present
    if (!storeId) storeId = localStorage.getItem('storeId') || '';
    if (!storeMobile) storeMobile = localStorage.getItem('storeMobile') || '';
    if (!email) email = localStorage.getItem('email') || '';

    // Log for debugging
    console.log('Billing API Params:', { storeId, storeMobile, email });

    // Only send params that are present
    const params: any = {};
    if (storeId) params.storeId = storeId;
    if (storeMobile) params.storeMobile = storeMobile;
    if (email) params.email = email;

    return this.http.get<unknown>(`${this.billingApiBaseUrl}`, { params }).pipe(
      map((response: any) => this.mapInvoiceList(response)),
      tap((invoices) => this.invoicesSubject.next(invoices))
    );
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
    if (!response || !Array.isArray(response)) return [];
    return response.map((item: any) => this.mapInvoiceResponse(item));
  }
}
