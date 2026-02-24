import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'vendor_is_logged_in';
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(this.readInitialState());

  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.getValue();
  }

  login(): void {
    localStorage.setItem(this.storageKey, 'true');
    this.isLoggedInSubject.next(true);
  }

  logout(): void {
    localStorage.setItem(this.storageKey, 'false');
    this.isLoggedInSubject.next(false);
  }

  private readInitialState(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }
}
