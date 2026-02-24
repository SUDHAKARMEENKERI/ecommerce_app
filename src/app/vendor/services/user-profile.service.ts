import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type VendorUserProfile = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  pharmacyName: string;
  gstinNumber: string;
  pharmacyCode: string;
  address: string;
};

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly profileSubject = new BehaviorSubject<VendorUserProfile>({
    fullName: 'Sudhakar Meenkari',
    email: 'sudhakarmeenkari@gmail.com',
    phone: '876543210',
    role: 'Owner',
    pharmacyName: 'PharmaDesk Main Branch',
    gstinNumber: '22AAAAA0000A1Z5',
    pharmacyCode: 'PD-26-1013',
    address: 'Abc address'
  });

  profile$: Observable<VendorUserProfile> = this.profileSubject.asObservable();

  getProfile(): VendorUserProfile {
    return { ...this.profileSubject.getValue() };
  }

  updateProfile(patch: Partial<VendorUserProfile>): void {
    const current = this.profileSubject.getValue();
    this.profileSubject.next({ ...current, ...patch });
  }
}
