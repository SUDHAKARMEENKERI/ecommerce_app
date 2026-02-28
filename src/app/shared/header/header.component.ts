import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileService } from '../../vendor/services/user-profile.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

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

  profile = {
    fullName: 'User',
    email: ''
  };

  constructor(
    private userProfileService: UserProfileService,
    private authService: AuthService,
    private router: Router
  ) {
    this.userProfileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.profile = {
          fullName: user.ownerName,
          email: user.email
        };
      });

    this.authService.isLoggedIn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loggedIn) => {
        this.isLoggedIn = loggedIn;
      });
  }

  get initials(): string {
    const parts = this.profile.fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }

    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
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

}
