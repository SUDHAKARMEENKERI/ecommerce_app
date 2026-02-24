import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-vendor-prescription',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-card">
      <h1>Prescriptions</h1>
      <p>This section is ready for implementation.</p>
    </section>
  `,
  styles: [
    `
      .page-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
      }

      .page-card h1 {
        margin: 0;
        font-size: 28px;
        color: #111827;
      }

      .page-card p {
        margin-top: 10px;
        font-size: 16px;
        color: #6b7280;
      }
    `
  ]
})
export class VendorPrescriptionComponent {}
