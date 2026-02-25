import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/services/auth.service';

export type MedicineItem = {
  id: string;
  name: string;
  brand: string;
  composition: string;
  category: string;
  batch: string;
  expiry: string;
  quantity: number;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expiring' | 'Expired';
  createdAt?: string;
};

export type CreateMedicineInput = {
  name: string;
  brand: string;
  composition: string;
  category: string;
  batch: string;
  expiry: string;
  quantity: number;
  price: number;
  storeMobile?: string;
  storeId?: string | number;
  email?: string;
};

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private readonly medicineApiBaseUrl = `${environment.apiBaseUrl}/api/medicine`;
  private readonly medicinesSubject = new BehaviorSubject<MedicineItem[]>([]);

  medicines$: Observable<MedicineItem[]> = this.medicinesSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  loadMedicinesFromApi(): Observable<MedicineItem[]> {
    // Extract storeId, email, storeMobile from AuthService/localStorage
    let storeId = '';
    let email = '';
    let storeMobile = '';
    const loginResponse = this.authService.loginResponse as any;
    if (loginResponse) {
      storeId = loginResponse.storeId || loginResponse.medicalStoreId || '';
      email = loginResponse.email || '';
      storeMobile = loginResponse.storeMobile || '';
    }
    const params = {
      storeId,
      email,
      storeMobile
    };
    return this.http.get<unknown>(`${this.medicineApiBaseUrl}/all`, { params }).pipe(
      map((response) => this.mapMedicineList(response)),
      tap((medicines) => this.medicinesSubject.next(medicines))
    );
  }

  addMedicineViaApi(input: CreateMedicineInput): Observable<MedicineItem> {
    const payload = {
      name: input.name.trim(),
      brand: input.brand.trim() || 'Generic',
      composition: input.composition.trim(),
      category: input.category.trim() || 'General',
      batch: input.batch.trim(),
      expiry: input.expiry,
      quantity: Math.max(0, input.quantity),
      price: Math.max(0, input.price),
      storeMobile: input.storeMobile?.trim() || '',
      storeId: this.normalizeStoreId(input.storeId),
      email: input.email?.trim() || ''
    };

    return this.http.post<unknown>(`${this.medicineApiBaseUrl}/add`, payload).pipe(
      map((response) => this.mapAddedMedicine(response, payload)),
      tap((medicine) => this.upsertMedicine(medicine))
    );
  }

  getMedicines(): MedicineItem[] {
    return this.medicinesSubject.getValue().map((item) => ({ ...item }));
  }

  addMedicine(input: CreateMedicineInput): MedicineItem {
    const current = this.medicinesSubject.getValue();
    const numericIds = current
      .map((item) => Number.parseInt(item.id.replace('M-', ''), 10))
      .filter((value) => !Number.isNaN(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    const medicine: MedicineItem = {
      id: `M-${String(nextId).padStart(3, '0')}`,
      name: input.name.trim(),
      brand: input.brand.trim() || 'Generic',
      composition: input.composition.trim(),
      category: input.category.trim() || 'General',
      batch: input.batch.trim(),
      expiry: input.expiry,
      quantity: Math.max(0, input.quantity),
      price: Math.max(0, input.price),
      status: this.getStatus(Math.max(0, input.quantity), input.expiry),
      createdAt: new Date().toISOString()
    };

    this.medicinesSubject.next([...current, medicine]);
    return medicine;
  }

  private mapAddedMedicine(
    response: unknown,
    fallbackPayload: {
      name: string;
      brand: string;
      composition: string;
      category: string;
      batch: string;
      expiry: string;
      quantity: number;
      price: number;
      storeMobile: string;
      storeId: string | number;
      email: string;
    }
  ): MedicineItem {
    const source = this.extractRecord(response);
    if (source) {
      const mapped = this.toMedicineItem(source, this.medicinesSubject.getValue().length);
      if (mapped) {
        return mapped;
      }
    }

    return {
      id: this.generateMedicineId(),
      name: fallbackPayload.name,
      brand: fallbackPayload.brand,
      composition: fallbackPayload.composition,
      category: fallbackPayload.category,
      batch: fallbackPayload.batch,
      expiry: fallbackPayload.expiry,
      quantity: fallbackPayload.quantity,
      price: fallbackPayload.price,
      status: this.getStatus(fallbackPayload.quantity, fallbackPayload.expiry),
      createdAt: new Date().toISOString()
    };
  }

  private mapMedicineList(response: unknown): MedicineItem[] {
    const sourceItems = this.extractRecords(response);
    if (sourceItems.length === 0) {
      return [];
    }

    return sourceItems
      .map((item, index) => this.toMedicineItem(item as Record<string, unknown>, index))
      .filter((item): item is MedicineItem => Boolean(item));
  }

  private extractRecords(response: unknown): unknown[] {
    if (typeof response === 'string') {
      try {
        return this.extractRecords(JSON.parse(response));
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

    // If response is a single medicine object, wrap it in an array
    const record = response as Record<string, unknown>;
    const candidates = [record['data'], record['items'], record['medicines'], record['result'], record['content']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }

      if (candidate && typeof candidate === 'object') {
        const nested = candidate as Record<string, unknown>;
        const nestedList = nested['items'] ?? nested['medicines'] ?? nested['data'] ?? nested['content'];
        if (Array.isArray(nestedList)) {
          return nestedList;
        }
      }
    }

    // If the object has typical medicine fields, treat as single medicine
    if ('name' in record && 'brand' in record && 'composition' in record && 'batch' in record) {
      return [record];
    }

    return [];
  }

  private extractRecord(response: unknown): Record<string, unknown> | null {
    if (typeof response === 'string') {
      try {
        return this.extractRecord(JSON.parse(response));
      } catch {
        return null;
      }
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    if (Array.isArray(response)) {
      const first = response[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }

    const record = response as Record<string, unknown>;
    const nested = record['data'] ?? record['medicine'] ?? record['result'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }

    return record;
  }

  private toMedicineItem(source: Record<string, unknown>, index: number): MedicineItem | null {
    const name = this.pickString(source, ['name', 'medicineName']);
    const batch = this.pickString(source, ['batch', 'batchNo']);
    const expiry = this.pickString(source, ['expiry', 'expiryDate']);

    if (!name || !batch || !expiry) {
      return null;
    }

    const quantity = this.pickNumber(source, ['quantity', 'qty', 'stock']);
    return {
      id: this.pickString(source, ['id', 'medicineId', '_id']) || `M-${String(index + 1).padStart(3, '0')}`,
      name,
      brand: this.pickString(source, ['brand', 'brandName']) || 'Generic',
      composition: this.pickString(source, ['composition', 'generic']) || 'NA',
      category: this.pickString(source, ['category', 'formulation']) || 'General',
      batch,
      expiry,
      quantity,
      price: this.pickNumber(source, ['price', 'sellPrice', 'mrp']),
      status: this.getStatus(quantity, expiry),
      createdAt: this.pickString(source, ['createdAt']) || new Date().toISOString()
    };
  }

  private upsertMedicine(medicine: MedicineItem): void {
    const current = this.medicinesSubject.getValue();
    const existingIndex = current.findIndex((item) => item.id === medicine.id || item.batch === medicine.batch);

    if (existingIndex < 0) {
      this.medicinesSubject.next([...current, medicine]);
      return;
    }

    const next = [...current];
    next[existingIndex] = {
      ...next[existingIndex],
      ...medicine
    };
    this.medicinesSubject.next(next);
  }

  private generateMedicineId(): string {
    const current = this.medicinesSubject.getValue();
    const numericIds = current
      .map((item) => Number.parseInt(item.id.replace('M-', ''), 10))
      .filter((value) => !Number.isNaN(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    return `M-${String(nextId).padStart(3, '0')}`;
  }

  private normalizeStoreId(storeId?: string | number): string | number {
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

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, value);
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) {
          return Math.max(0, parsed);
        }
      }
    }

    return 0;
  }

  decreaseStock(medicineId: string, qty = 1): boolean {
    if (qty <= 0) {
      return false;
    }

    const current = this.medicinesSubject.getValue();
    const next = current.map((item) => {
      if (item.id !== medicineId) {
        return item;
      }

      if (item.quantity < qty) {
        return item;
      }

      const quantity = item.quantity - qty;
      return {
        ...item,
        quantity,
        status: this.getStatus(quantity, item.expiry)
      };
    });

    const before = current.find((item) => item.id === medicineId)?.quantity ?? 0;
    const after = next.find((item) => item.id === medicineId)?.quantity ?? 0;
    if (before === after) {
      return false;
    }

    this.medicinesSubject.next(next);
    return true;
  }

  increaseStock(medicineId: string, qty = 1): void {
    if (qty <= 0) {
      return;
    }

    const current = this.medicinesSubject.getValue();
    const next = current.map((item) => {
      if (item.id !== medicineId) {
        return item;
      }

      const quantity = item.quantity + qty;
      return {
        ...item,
        quantity,
        status: this.getStatus(quantity, item.expiry)
      };
    });

    this.medicinesSubject.next(next);
  }

  private getStatus(quantity: number, expiry: string): MedicineItem['status'] {
    const now = new Date();
    const expiryDate = new Date(expiry);
    const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (expiryDate < now) {
      return 'Expired';
    }

    if (quantity === 0) {
      return 'Out of Stock';
    }

    if (daysToExpiry >= 0 && daysToExpiry <= 30) {
      return 'Expiring';
    }

    if (quantity <= 10) {
      return 'Low Stock';
    }

    return 'In Stock';
  }
}
