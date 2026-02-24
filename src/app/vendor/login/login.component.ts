import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-vendor-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class VendorLoginComponent {
  storeId = '';
  password = '';
  role = 'owner';
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  onSubmit() {
    if (!this.storeId.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter store ID/mobile and password.';
      return;
    }

    this.errorMessage = '';
    this.authService.login();
    this.router.navigate(['/vendor/dashboard']);
  }
}