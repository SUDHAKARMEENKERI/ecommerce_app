import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
};

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private readonly medicinesSubject = new BehaviorSubject<MedicineItem[]>([
    {
      id: 'M-001',
      name: 'Paracetamol 500mg',
      brand: 'MediCare',
      composition: 'Paracetamol',
      category: 'Tablet',
      batch: 'B1031',
      expiry: '2026-12-10',
      quantity: 120,
      price: 45,
      status: 'In Stock'
    },
    {
      id: 'M-002',
      name: 'Amoxicillin 250mg',
      brand: 'HealthPlus',
      composition: 'Amoxicillin',
      category: 'Capsule',
      batch: 'A2207',
      expiry: '2026-03-15',
      quantity: 8,
      price: 90,
      status: 'Low Stock'
    },
    {
      id: 'M-003',
      name: 'Vitamin C 500',
      brand: 'NutraLife',
      composition: 'Ascorbic Acid',
      category: 'Supplement',
      batch: 'V3102',
      expiry: '2026-02-25',
      quantity: 24,
      price: 120,
      status: 'Expiring'
    },
    {
      id: 'M-004',
      name: 'Cough Syrup',
      brand: 'Relief',
      composition: 'Dextromethorphan',
      category: 'Syrup',
      batch: 'C8801',
      expiry: '2025-12-15',
      quantity: 0,
      price: 75,
      status: 'Out of Stock'
    },
    {
      id: 'M-005',
      name: 'Insulin Pen',
      brand: 'DiaCare',
      composition: 'Insulin Glargine',
      category: 'Injection',
      batch: 'I0905',
      expiry: '2025-10-01',
      quantity: 3,
      price: 650,
      status: 'Expired'
    }
  ]);

  medicines$: Observable<MedicineItem[]> = this.medicinesSubject.asObservable();

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
