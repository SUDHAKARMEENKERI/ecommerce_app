import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  createdAt: string;
  read: boolean;
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storageKey = 'app.notifications';
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>(this.readStoredNotifications());
  private readonly lastKeySignatures = new Map<string, string>();

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.notifications$.pipe(map((items) => items.filter((item) => !item.read).length));

  add(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    const next: AppNotification = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      read: false,
      ...notification
    };

    const updated = [next, ...this.notificationsSubject.getValue()].slice(0, 50);
    this.notificationsSubject.next(updated);
    this.persist(updated);
  }

  success(title: string, message: string) {
    this.add({ title, message, type: 'success' });
  }

  error(title: string, message: string) {
    this.add({ title, message, type: 'error' });
  }

  info(title: string, message: string) {
    this.add({ title, message, type: 'info' });
  }

  infoOnce(key: string, title: string, message: string) {
    this.addOnce(key, { title, message, type: 'info' });
  }

  errorOnce(key: string, title: string, message: string) {
    this.addOnce(key, { title, message, type: 'error' });
  }

  successOnce(key: string, title: string, message: string) {
    this.addOnce(key, { title, message, type: 'success' });
  }

  notifyWhenChanged(
    key: string,
    signature: string,
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ) {
    const previous = this.lastKeySignatures.get(key);
    if (previous === signature) {
      return;
    }

    this.lastKeySignatures.set(key, signature);
    this.add(notification);
  }

  markAllAsRead() {
    const updated = this.notificationsSubject.getValue().map((item) => ({ ...item, read: true }));
    this.notificationsSubject.next(updated);
    this.persist(updated);
  }

  clearAll() {
    this.notificationsSubject.next([]);
    this.persist([]);
    this.lastKeySignatures.clear();
  }

  private addOnce(key: string, notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    const previous = this.lastKeySignatures.get(key);
    if (previous === 'shown') {
      return;
    }

    this.lastKeySignatures.set(key, 'shown');
    this.add(notification);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private readStoredNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as AppNotification[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item) => Boolean(item?.id && item?.title && item?.message));
    } catch {
      return [];
    }
  }

  private persist(items: AppNotification[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // no-op
    }
  }
}
