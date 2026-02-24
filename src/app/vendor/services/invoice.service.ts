import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
};

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly invoicesSubject = new BehaviorSubject<InvoiceItem[]>([]);

  invoices$: Observable<InvoiceItem[]> = this.invoicesSubject.asObservable();

  getInvoices(): InvoiceItem[] {
    return this.invoicesSubject.getValue().map((item) => ({ ...item }));
  }

  createInvoice(input: {
    customerName: string;
    customerPhone: string;
    patientGender?: string;
    patientAge?: string;
    doctorName?: string;
    referredBy?: string;
    amount: number;
    itemCount: number;
    lineItems?: InvoiceLineItem[];
    date?: string;
  }): InvoiceItem {
    const customerName = input.customerName.trim();
    const customerPhone = input.customerPhone.trim();
    const patientGender = (input.patientGender ?? '').trim();
    const patientAge = (input.patientAge ?? '').trim();
    const doctorName = (input.doctorName ?? '').trim();
    const referredBy = (input.referredBy ?? '').trim();
    const amount = Math.max(0, input.amount);
    const itemCount = Math.max(0, input.itemCount);
    const lineItems = (input.lineItems ?? []).map((item) => ({
      medicineName: item.medicineName.trim(),
      brand: item.brand.trim(),
      composition: item.composition.trim(),
      batch: item.batch.trim(),
      qty: Math.max(0, item.qty),
      unitPrice: Math.max(0, item.unitPrice),
      total: Math.max(0, item.total)
    }));
    const date = input.date ?? new Date().toISOString();

    const sequence = this.invoicesSubject.getValue().length + 1;
    const invoice: InvoiceItem = {
      id: `INV-${String(sequence).padStart(4, '0')}`,
      customerName,
      customerPhone,
      patientGender,
      patientAge,
      doctorName,
      referredBy,
      amount,
      itemCount,
      lineItems,
      date
    };

    this.invoicesSubject.next([invoice, ...this.invoicesSubject.getValue()]);
    return invoice;
  }
}
