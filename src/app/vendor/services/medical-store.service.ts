import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MedicalStoreService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/medical-store`;

  constructor(private http: HttpClient) {}

  patchStore(storeId: string, payload: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/patch/${storeId}`, payload);
  }
}
