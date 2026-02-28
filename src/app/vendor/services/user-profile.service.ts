import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';

export type VendorUserProfile = {
  ownerName: string;
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
  private readonly profileSubject = new BehaviorSubject<VendorUserProfile>(this.buildProfileFromLoginResponse(null));

  profile$: Observable<VendorUserProfile> = this.profileSubject.asObservable();

  constructor(private authService: AuthService) {
    this.syncProfileFromLoginResponse();
  }

  getProfile(): VendorUserProfile {
    return { ...this.profileSubject.getValue() };
  }

  updateProfile(patch: Partial<VendorUserProfile>): void {
    const current = this.profileSubject.getValue();
    this.profileSubject.next({ ...current, ...patch });
  }

  syncProfileFromLoginResponse(): void {
    const loginResponse = this.authService.loginResponse;
    const profile = this.buildProfileFromLoginResponse(loginResponse);
    this.profileSubject.next(profile);
  }

  private buildProfileFromLoginResponse(loginResponse: unknown): VendorUserProfile {
    const source = this.extractPayload(loginResponse);

    return {
      ownerName: this.readString(source, ['ownerName', 'fullName', 'name', 'userName']),
      email: this.readString(source, ['email', 'mailId']),
      phone: this.readString(source, ['phone', 'mobile', 'mobileNo', 'mobileOrStoreId','storeMobile']),
      role: this.readString(source, ['role', 'loginAs']) || 'Owner',
      pharmacyName: this.readString(source, ['pharmacyName', 'storeName', 'medicalStoreName']),
      gstinNumber: this.readString(source, ['gstinNumber', 'gstin']),
      pharmacyCode: this.readString(source, ['pharmacyCode', 'storeCode']),
      address: this.readString(source, ['address', 'storeAddress'])
    };
  }

  private extractPayload(loginResponse: unknown): Record<string, unknown> {
    if (!loginResponse) {
      return {};
    }

    if (typeof loginResponse === 'string') {
      try {
        const parsed = JSON.parse(loginResponse);
        return this.extractPayload(parsed);
      } catch {
        return {};
      }
    }

    if (typeof loginResponse !== 'object') {
      return {};
    }

    const payload = loginResponse as Record<string, unknown>;
    const nestedData = payload['data'];

    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }

    return payload;
  }

  private readString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }
}
