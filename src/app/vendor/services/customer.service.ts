import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  visits: number;
  lastVisit: string;
};

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly customersSubject = new BehaviorSubject<CustomerItem[]>([
    { id: 'C-001', name: 'Arun Kumar', phone: '9876543210', totalSpent: 12450, visits: 14, lastVisit: '2026-02-19T10:45:00.000Z' },
    { id: 'C-002', name: 'Meera Sharma', phone: '9123456780', totalSpent: 8920, visits: 11, lastVisit: '2026-02-20T17:10:00.000Z' },
    { id: 'C-003', name: 'Rahul Verma', phone: '9988776655', totalSpent: 6320, visits: 8, lastVisit: '2026-02-16T09:25:00.000Z' },
    { id: 'C-004', name: 'Kavya Nair', phone: '9012345678', totalSpent: 4150, visits: 6, lastVisit: '2026-02-14T14:00:00.000Z' },
    { id: 'C-005', name: 'Sanjay Das', phone: '9090909090', totalSpent: 2790, visits: 4, lastVisit: '2026-02-21T08:20:00.000Z' }
  ]);

  customers$: Observable<CustomerItem[]> = this.customersSubject.asObservable();

  getCustomers(): CustomerItem[] {
    return this.customersSubject.getValue().map((item) => ({ ...item }));
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
        totalSpent: amount,
        visits: 1,
        lastVisit: nowIso
      },
      ...current
    ]);
  }
}
