import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileService } from '../../vendor/services/user-profile.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AppNotification, NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private destroyRef = inject(DestroyRef);
  isLoggedIn = false;
  isNotificationPanelOpen = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];

  profile = {
    fullName: 'User',
    email: '',
    storeName: ''
  };

  constructor(
    private userProfileService: UserProfileService,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private elementRef: ElementRef<HTMLElement>
  ) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.profile = {
          fullName: user.ownerName,
          email: user.email,
          storeName: user.pharmacyName
        };
      });

    this.authService.isLoggedIn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loggedIn) => {
        this.isLoggedIn = loggedIn;
      });

    this.notificationService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.notifications = items;
      });

    this.notificationService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((count) => {
        this.unreadCount = count;
      });
  }

  get initials(): string {
    const parts = this.profile.fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }

    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get headerMedicalName(): string {
    return this.profile.storeName || this.profile.fullName;
  }

  ngOnInit() {
    // Replace with actual auth check if available
    this.isLoggedIn = this.authService.isLoggedIn ?? false;
  }

  onLoginLogout() {
    if (this.isLoggedIn) {
      this.authService.logout?.();
      this.router.navigate(['/vendor/login']);
    } else {
      this.router.navigate(['/vendor/login']);
    }
  }

  goToDashboard() {
    this.router.navigate(['/vendor/dashboard']);
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.isNotificationPanelOpen = !this.isNotificationPanelOpen;

    if (this.isNotificationPanelOpen) {
      this.notificationService.markAllAsRead();
    }
  }

  clearNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.notificationService.clearAll();
  }

  formatNotificationTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isNotificationPanelOpen) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.isNotificationPanelOpen = false;
    }
  }

}
