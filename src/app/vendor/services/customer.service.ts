import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/services/notification.service';

export type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  age: string;
  doctorName: string;
  referredBy: string;
  totalSpent: number;
  visits: number;
  lastVisit: string;
  storeMobile?: string;
  medicalStoreEmail?: string;
  medicalStoreId?: string;
};

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly customerApiBaseUrl = `${environment.apiBaseUrl}/api/medical-store/customer`;
  private readonly customersSubject = new BehaviorSubject<CustomerItem[]>([]);

  customers$: Observable<CustomerItem[]> = this.customersSubject.asObservable();

  constructor(private http: HttpClient, private notificationService: NotificationService) {}

  loadCustomers(input: { email: string; storeMobile: string; storeId: string | number }): Observable<CustomerItem[]> {
    const email = input.email.trim();
    const storeMobile = input.storeMobile.trim();
    const storeId = String(input.storeId ?? '').trim();

    if (!email || !storeMobile || !storeId) {
      this.customersSubject.next([]);
      return of([]);
    }

    const params = new HttpParams().set('email', email).set('storeMobile', storeMobile).set('storeId', storeId);

    return this.http.get<unknown>(`${this.customerApiBaseUrl}/all`, { params }).pipe(
      map((response) => this.mapCustomerListResponse(response)),
      tap((customers) => this.customersSubject.next(customers)),
      catchError(() => {
        this.notificationService.errorOnce(
          'customer-sync-error',
          'API Sync Error',
          'Failed to sync customers from server.'
        );
        this.customersSubject.next([]);
        return of([]);
      })
    );
  }

  addCustomerProfile(input: {
    name: string;
    phone: string;
    gender: string;
    age: string;
    doctorName: string;
    referredBy: string;
    storeMobile: string;
    storeId: string | number;
    email: string;
  }): Observable<CustomerItem> {
    const payload = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      gender: input.gender.trim(),
      age: input.age.trim(),
      doctorName: input.doctorName.trim(),
      referredBy: input.referredBy.trim(),
      storeMobile: input.storeMobile.trim(),
      storeId: this.normalizeStoreId(input.storeId),
      email: input.email.trim()
    };

    return this.http.post<unknown>(`${this.customerApiBaseUrl}/add`, payload).pipe(
      map((response) => this.mapAddedCustomer(response, payload)),
      tap((customer) => this.upsertCustomer(customer))
    );
  }

  updateCustomerPurchaseDetails(input: {
    customerId: string;
    name: string;
    phone: string;
    spent: number;
    visited: string;
    storeMobile: string;
    storeId: string | number;
    email: string;
  }): Observable<CustomerItem> {
    const customerId = input.customerId.trim();
    const phone = input.phone.trim();
    const name = input.name.trim();
    const storeMobile = input.storeMobile.trim();
    const storeId = String(input.storeId ?? '').trim();
    const email = input.email.trim();
    const spent = Math.max(0, input.spent);
    const visited = input.visited.trim();

    if (!customerId || !phone || !storeMobile || !storeId || !email || !visited) {
      this.recordPurchase({
        name,
        phone,
        amount: spent,
        date: visited
      });
      return of(this.findByPhone(phone) ?? this.createFallbackCustomer(name, phone, spent, visited));
    }

    const payload = {
      name,
      phone,
      spent,
      visited,
      storeMobile,
      storeId: this.normalizeStoreId(storeId),
      email
    };

    return this.http.patch<unknown>(`${this.customerApiBaseUrl}/${encodeURIComponent(customerId)}`, payload).pipe(
      map((response) => this.mapPatchedCustomer(response, payload)),
      tap((customer) => this.upsertCustomer(customer))
    );
  }

  getCustomers(): CustomerItem[] {
    return this.customersSubject.getValue().map((item) => ({ ...item }));
  }

  findByPhone(phone: string): CustomerItem | null {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      return null;
    }

    const match = this.customersSubject.getValue().find((item) => item.phone === normalizedPhone);
    return match ? { ...match } : null;
  }

  findByName(name: string): CustomerItem | null {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }

    const match = this.customersSubject
      .getValue()
      .find((item) => item.name.trim().toLowerCase() === normalizedName);
    return match ? { ...match } : null;
  }

  addOrUpdateCustomerProfile(input: {
    name: string;
    phone: string;
    gender: string;
    age: string;
    doctorName: string;
    referredBy: string;
    storeMobile?: string;
    medicalStoreEmail?: string;
    medicalStoreId?: string;
  }): { customer: CustomerItem; isUpdate: boolean } {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const gender = input.gender.trim();
    const age = input.age.trim();
    const doctorName = input.doctorName.trim();
    const referredBy = input.referredBy.trim();
    const storeMobile = input.storeMobile?.trim() || '';
    const medicalStoreEmail = input.medicalStoreEmail?.trim() || '';
    const medicalStoreId = input.medicalStoreId?.trim() || '';

    if (!name || !phone || !gender || !age || !doctorName || !referredBy) {
      throw new Error('All customer profile fields are required.');
    }

    const current = this.customersSubject.getValue();
    const existingIndex = current.findIndex((item) => item.phone === phone);

    if (existingIndex >= 0) {
      const updated = [...current];
      const existing = updated[existingIndex];
      const nextCustomer: CustomerItem = {
        ...existing,
        name,
        phone,
        gender,
        age,
        doctorName,
        referredBy,
        storeMobile: storeMobile || existing.storeMobile || '',
        medicalStoreEmail: medicalStoreEmail || existing.medicalStoreEmail || '',
        medicalStoreId: medicalStoreId || existing.medicalStoreId || ''
      };
      updated[existingIndex] = nextCustomer;
      this.customersSubject.next(updated);
      return { customer: { ...nextCustomer }, isUpdate: true };
    }

    const numericIds = current
      .map((item) => Number.parseInt(item.id.replace('C-', ''), 10))
      .filter((value) => !Number.isNaN(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    const customer: CustomerItem = {
      id: `C-${String(nextId).padStart(3, '0')}`,
      name,
      phone,
      gender,
      age,
      doctorName,
      referredBy,
      totalSpent: 0,
      visits: 0,
      lastVisit: new Date().toISOString(),
      storeMobile,
      medicalStoreEmail,
      medicalStoreId
    };

    this.customersSubject.next([customer, ...current]);
    return { customer: { ...customer }, isUpdate: false };
  }

  recordPurchase(input: { name: string; phone: string; amount: number; date?: string }): void {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const amount = Math.max(0, input.amount);

    if (!name || !phone || amount <= 0) {
      return;
    }

    const nowIso = input.date ?? new Date().toISOString();
    const current = this.customersSubject.getValue();
    const existingIndex = current.findIndex((item) => item.phone === phone);

    if (existingIndex >= 0) {
      const updated = [...current];
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        name,
        totalSpent: existing.totalSpent + amount,
        visits: existing.visits + 1,
        lastVisit: nowIso
      };
      this.customersSubject.next(updated);
      return;
    }

    const numericIds = current
      .map((item) => Number.parseInt(item.id.replace('C-', ''), 10))
      .filter((value) => !Number.isNaN(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    this.customersSubject.next([
      {
        id: `C-${String(nextId).padStart(3, '0')}`,
        name,
        phone,
        gender: 'NA',
        age: 'NA',
        doctorName: 'NA',
        referredBy: 'Direct',
        totalSpent: amount,
        visits: 1,
        lastVisit: nowIso
      },
      ...current
    ]);
  }

  private mapCustomerListResponse(response: unknown): CustomerItem[] {
    const sourceItems = this.extractCustomerArray(response);

    return sourceItems
      .map((item, index) => this.toCustomerItem(item, index))
      .filter((item): item is CustomerItem => Boolean(item));
  }

  private mapAddedCustomer(
    response: unknown,
    fallbackPayload: {
      name: string;
      phone: string;
      gender: string;
      age: string;
      doctorName: string;
      referredBy: string;
      storeMobile: string;
      storeId: string | number;
      email: string;
    }
  ): CustomerItem {
    const responseRecord = this.extractCustomerRecord(response);
    if (responseRecord) {
      const mappedCustomer = this.toCustomerItem(responseRecord, this.customersSubject.getValue().length);
      if (mappedCustomer) {
        return mappedCustomer;
      }
    }

    return {
      id: this.generateCustomerId(),
      name: fallbackPayload.name,
      phone: fallbackPayload.phone,
      gender: fallbackPayload.gender,
      age: fallbackPayload.age,
      doctorName: fallbackPayload.doctorName,
      referredBy: fallbackPayload.referredBy,
      totalSpent: 0,
      visits: 0,
      lastVisit: new Date().toISOString(),
      storeMobile: fallbackPayload.storeMobile,
      medicalStoreEmail: fallbackPayload.email,
      medicalStoreId: String(fallbackPayload.storeId)
    };
  }

  private mapPatchedCustomer(
    response: unknown,
    fallbackPayload: {
      name: string;
      phone: string;
      spent: number;
      visited: string;
      storeMobile: string;
      storeId: string | number;
      email: string;
    }
  ): CustomerItem {
    const responseRecord = this.extractCustomerRecord(response);
    if (responseRecord) {
      const mappedCustomer = this.toCustomerItem(responseRecord, this.customersSubject.getValue().length);
      if (mappedCustomer) {
        return mappedCustomer;
      }
    }

    const existing = this.findByPhone(fallbackPayload.phone);
    if (existing) {
      return {
        ...existing,
        name: fallbackPayload.name || existing.name,
        totalSpent: existing.totalSpent + fallbackPayload.spent,
        visits: existing.visits + 1,
        lastVisit: fallbackPayload.visited,
        storeMobile: fallbackPayload.storeMobile,
        medicalStoreEmail: fallbackPayload.email,
        medicalStoreId: String(fallbackPayload.storeId)
      };
    }

    return this.createFallbackCustomer(
      fallbackPayload.name,
      fallbackPayload.phone,
      fallbackPayload.spent,
      fallbackPayload.visited,
      fallbackPayload.storeMobile,
      fallbackPayload.email,
      String(fallbackPayload.storeId)
    );
  }

  private extractCustomerArray(response: unknown): unknown[] {
    if (typeof response === 'string') {
      try {
        return this.extractCustomerArray(JSON.parse(response));
      } catch {
        return [];
      }
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const record = response as Record<string, unknown>;
    const keys = ['data', 'customers', 'customerList', 'items', 'content', 'result'];

    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        const nestedCandidates = [nested['customers'], nested['items'], nested['content'], nested['data']];
        for (const candidate of nestedCandidates) {
          if (Array.isArray(candidate)) {
            return candidate;
          }
        }
      }
    }

    return [];
  }

  private extractCustomerRecord(response: unknown): unknown {
    if (typeof response === 'string') {
      try {
        return this.extractCustomerRecord(JSON.parse(response));
      } catch {
        return null;
      }
    }

    if (Array.isArray(response)) {
      return response[0];
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    const record = response as Record<string, unknown>;
    const keys = ['data', 'customer', 'result'];

    for (const key of keys) {
      const value = record[key];
      if (value && typeof value === 'object') {
        return value;
      }
    }

    return response;
  }

  private toCustomerItem(input: unknown, index: number): CustomerItem | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const source = input as Record<string, unknown>;
    const phone = this.pickString(source, ['phone', 'mobile', 'mobileNo', 'customerPhone']);
    const name = this.pickString(source, ['name', 'customerName']);

    if (!phone || !name) {
      return null;
    }

    const lastVisit = this.pickString(source, ['lastVisit', 'visited', 'updatedAt', 'createdAt', 'visitDate']) || new Date().toISOString();

    return {
      id: this.pickString(source, ['id', 'customerId', '_id']) || `C-${String(index + 1).padStart(3, '0')}`,
      name,
      phone,
      gender: this.pickString(source, ['gender']) || 'NA',
      age: this.pickString(source, ['age']) || 'NA',
      doctorName: this.pickString(source, ['doctorName']) || 'NA',
      referredBy: this.pickString(source, ['referredBy']) || 'Direct',
      totalSpent: this.pickNumber(source, ['totalSpent', 'spent', 'totalAmount', 'amount']),
      visits: this.pickNumber(source, ['visits', 'visitCount', 'totalVisits']),
      lastVisit,
      storeMobile: this.pickString(source, ['storeMobile', 'mobile', 'mobileNo']),
      medicalStoreEmail: this.pickString(source, ['email', 'mailId', 'storeEmail']),
      medicalStoreId: this.pickString(source, ['id', 'storeId', 'medicalStoreId', 'pharmacyCode'])
    };
  }

  private upsertCustomer(customer: CustomerItem): void {
    const current = this.customersSubject.getValue();
    const existingIndex = current.findIndex((item) => item.phone === customer.phone);

    if (existingIndex < 0) {
      this.customersSubject.next([customer, ...current]);
      return;
    }

    const updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      ...customer
    };
    this.customersSubject.next(updated);
  }

  private createFallbackCustomer(
    name: string,
    phone: string,
    spent: number,
    visited: string,
    storeMobile = '',
    email = '',
    storeId = ''
  ): CustomerItem {
    return {
      id: this.generateCustomerId(),
      name: name || 'Customer',
      phone,
      gender: 'NA',
      age: 'NA',
      doctorName: 'NA',
      referredBy: 'Direct',
      totalSpent: Math.max(0, spent),
      visits: 1,
      lastVisit: visited || new Date().toISOString(),
      storeMobile,
      medicalStoreEmail: email,
      medicalStoreId: storeId
    };
  }

  private generateCustomerId(): string {
    const numericIds = this.customersSubject
      .getValue()
      .map((item) => Number.parseInt(item.id.replace('C-', ''), 10))
      .filter((value) => !Number.isNaN(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    return `C-${String(nextId).padStart(3, '0')}`;
  }

  private normalizeStoreId(storeId: string | number): string | number {
    const value = String(storeId ?? '').trim();
    if (!value) {
      return '';
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number') {
        return String(value);
      }
    }

    return '';
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
  }
}
