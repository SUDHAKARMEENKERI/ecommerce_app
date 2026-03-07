import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MedicalStoreDetailsResponse {
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class MedicalStoreService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/medical-store`;

  constructor(private http: HttpClient) {}

  getStoreDetails(email: string, mobile: string): Observable<MedicalStoreDetailsResponse> {
    return this.http.get<MedicalStoreDetailsResponse>(`${this.baseUrl}/details`, {
      params: {
        email,
        mobile
      }
    });
  }

  patchStore(storeId: string, payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/patch/${storeId}`, payload);
  }
}
