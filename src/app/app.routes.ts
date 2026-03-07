

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
import { FooterPageComponent } from './vendor/footer-page/footer-page.component';
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
			{ path: 'license', component: VendorLicenseComponent, data: { title: 'License' } },
			{
				path: 'shop/medicines',
				component: FooterPageComponent,
				data: {
					title: 'Shop Medicines',
					description: 'Browse trusted medicines by category and availability.',
					points: ['Search by medicine name or composition.', 'Check stock and expiry before purchase.', 'Get genuine products from verified suppliers.']
				}
			},
			{
				path: 'shop/devices',
				component: FooterPageComponent,
				data: {
					title: 'Healthcare Devices',
					description: 'Explore healthcare equipment and wellness devices.',
					points: ['View product specifications and pricing.', 'Compare options for home and clinic use.', 'Track procurement from the purchases section.']
				}
			},
			{
				path: 'shop/personal-care',
				component: FooterPageComponent,
				data: {
					title: 'Personal Care',
					description: 'Personal care essentials for daily health needs.',
					points: ['Find trusted hygiene and wellness products.', 'Manage categories from inventory as needed.', 'Review demand patterns in analytics reports.']
				}
			},
			{
				path: 'offers',
				component: FooterPageComponent,
				data: {
					title: 'Special Offers',
					description: 'Stay updated on current promotions and discounts.',
					points: ['Track promotional sales impact in analytics.', 'Plan inventory for seasonal demand spikes.', 'Use reports to evaluate campaign performance.']
				}
			},
			{
				path: 'track-order',
				component: FooterPageComponent,
				data: {
					title: 'Track Order',
					description: 'Monitor purchase and fulfillment updates in one place.',
					points: ['Use purchase records to track supplier orders.', 'Verify expected delivery timelines.', 'Update stock after order receipt.']
				}
			},
			{
				path: 'return-policy',
				component: FooterPageComponent,
				data: {
					title: 'Return Policy',
					description: 'Understand return guidelines for products and orders.',
					points: ['Initiate return request with invoice details.', 'Validate item condition and eligibility period.', 'Complete adjustments in billing records.']
				}
			},
			{
				path: 'faq',
				component: FooterPageComponent,
				data: {
					title: 'FAQs',
					description: 'Frequently asked questions about store operations.',
					points: ['How to manage medicine inventory efficiently.', 'How to process billing and prescriptions.', 'How to review business performance reports.']
				}
			},
			{
				path: 'contact-us',
				component: FooterPageComponent,
				data: {
					title: 'Contact Us',
					description: 'Reach support for assistance with account or store issues.',
					points: ['Email: support@medstore.com', 'Phone: 1-800-MED-CARE', 'Support hours: Monday to Saturday, 9 AM to 7 PM.']
				}
			}
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
