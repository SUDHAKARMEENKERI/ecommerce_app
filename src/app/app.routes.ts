

import { Routes } from '@angular/router';
import { VendorLoginComponent } from './vendor/login/login.component';
import { VendorSignupComponent } from './vendor/signup/signup.component';
import { VendorDashboardComponent } from './vendor/dashboard/dashboard.component';
import { VendorLayoutComponent } from './vendor/layout.component';
import { VendorInventoryComponent } from './vendor/inventory/inventory.component';
import { VendorBillingComponent } from './vendor/billing/billing.component';
import { VendorPrescriptionComponent } from './vendor/prescription/prescription.component';
import { VendorCustomersComponent } from './vendor/customers/customers.component';
import { VendorPurchaseComponent } from './vendor/purchase/purchase.component';
import { VendorAnalyticsComponent } from './vendor/analytics/analytics.component';
import { VendorStaffComponent } from './vendor/staff/staff.component';
import { VendorSettingsComponent } from './vendor/settings/settings.component';
import { VendorAddMedicineComponent } from './vendor/add-medicine/add-medicine.component';
import { VendorLicenseComponent } from './vendor/license/license.component';
import { VendorAccountComponent } from './vendor/account/account.component';
import { VendorReportsComponent } from './vendor/reports/reports.component';
import { ForgotPasswordComponent } from './vendor/forgot/forgot.component';
import { authChildGuard, authGuard } from './shared/guards/auth.guard';
import { publicOnlyGuard } from './shared/guards/public-only.guard';

export const routes: Routes = [
   {
	   path: 'vendor/login',
	   component: VendorLoginComponent,
	   canActivate: [publicOnlyGuard]
   },
   {
	   path: 'vendor/forgot',
	   component: ForgotPasswordComponent,
	   canActivate: [publicOnlyGuard]
   },
   {
	   path: 'vendor/signup',
	   component: VendorSignupComponent,
	   canActivate: [publicOnlyGuard]
   },
	{
		path: 'vendor',
		component: VendorLayoutComponent,
		canActivate: [authGuard],
		canActivateChild: [authChildGuard],
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard'
			},
			{
				path: 'dashboard',
				component: VendorDashboardComponent
			},
			{ path: 'billing', component: VendorBillingComponent, data: { title: 'Billing / POS' } },
			{ path: 'inventory/add', component: VendorAddMedicineComponent, data: { title: 'Add Medicine' } },
			{ path: 'inventory', component: VendorInventoryComponent, data: { title: 'Inventory' } },
			{ path: 'prescription', component: VendorPrescriptionComponent, data: { title: 'Prescriptions' } },
			{ path: 'customer', component: VendorCustomersComponent, data: { title: 'Customers' } },
			{ path: 'purchase', component: VendorPurchaseComponent, data: { title: 'Purchases' } },
			{ path: 'analytics', component: VendorAnalyticsComponent, data: { title: 'Analytics' } },
			{ path: 'reports', component: VendorReportsComponent, data: { title: 'Reports' } },
			{ path: 'staff', component: VendorStaffComponent, data: { title: 'Staff' } },
			{ path: 'account', component: VendorAccountComponent, data: { title: 'Account' } },
			{ path: 'settings', component: VendorSettingsComponent, data: { title: 'Settings' } },
			{ path: 'license', component: VendorLicenseComponent, data: { title: 'License' } }
		]
	},
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'vendor/login'
	},
	{
		path: '**',
		redirectTo: 'vendor/dashboard'
	}
];
