import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicineItem, MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerItem, CustomerService } from '../services/customer.service';
import { InvoiceItem, InvoiceService } from '../services/invoice.service';
import { AuthService } from '../../shared/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

type CartItem = {
  medicine: MedicineItem;
  qty: number;
};

@Component({
  selector: 'app-vendor-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.scss']
})
export class VendorPurchaseComponent {
  private destroyRef = inject(DestroyRef);
  private readonly receiptMeta = {
    hospitalName: 'AAROGYA HOSPITAL',
    hospitalAddress: 'Municipal No. 9-01-298/299, Taj complex, near Bhagat Singh Circle, opp Ashoka Hotel, beside sales tax office, Bidar-585401',
    phoneNo: '8197526666, 7795923031',
    reportUrl: 'http://server/AAROGYA/Reports/ReportViewerForBills.aspx',
    doctorName: 'Dr. MALLIKARJUN PANSHETTY (INTENSIVIST & PAIN MGT)',
    referredBy: 'Direct',
    validityLabel: 'Valid for 1 day',
    authorizedBy: 'PRATIKSHA'
  };

  private getReceiptMetaFromLogin() {
    const source = this.extractSource(this.authService.loginResponse);

    const hospitalName =
      this.pickValue(source, ['pharmacyName', 'storeName', 'medicalName', 'hospitalName', 'name']) ||
      this.receiptMeta.hospitalName;

    const hospitalAddress =
      this.pickValue(source, ['address', 'storeAddress', 'hospitalAddress']) ||
      this.receiptMeta.hospitalAddress;

    const primaryPhone = this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']);
    const secondaryPhone = this.pickValue(source, ['alternatePhone', 'altPhone']);
    const phoneNo = [primaryPhone, secondaryPhone].filter(Boolean).join(', ') || this.receiptMeta.phoneNo;

    const doctorName = this.pickValue(source, ['doctorName']) || this.receiptMeta.doctorName;
    const referredBy = this.pickValue(source, ['referredBy']) || this.receiptMeta.referredBy;
    const authorizedBy =
      this.pickValue(source, ['ownerName', 'userName', 'name']) ||
      this.receiptMeta.authorizedBy;

    return {
      hospitalName,
      hospitalAddress,
      phoneNo,
      reportUrl: this.receiptMeta.reportUrl,
      doctorName,
      referredBy,
      validityLabel: this.receiptMeta.validityLabel,
      authorizedBy
    };
  }

  constructor(
    private medicineService: MedicineService,
    private customerService: CustomerService,
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.medicineService.medicines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((medicines) => {
        this.medicines = medicines;
      });

    this.medicineService
      .loadMedicinesFromApi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.customerService.customers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((customers) => {
        this.customers = customers;
      });
  }

  shortcuts = ['F2 Search', 'F4 Payment', 'F9 Billing'];
  medicineQuery = '';
  isMedicinePickerOpen = true;
  modalMedicineQuery = '';
  modalPage = 1;
  readonly modalPageSize = 10;
  medicines: MedicineItem[] = [];
  customers: CustomerItem[] = [];
  cartItems: CartItem[] = [];
  customerPhone = '';
  customerName = '';
  matchedCustomer: CustomerItem | null = null;
  invoiceMessage = '';
  invoiceMessageType: 'success' | 'error' = 'success';

  get filteredMedicines(): MedicineItem[] {
    const query = this.medicineQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return this.medicines
      .filter((item) => item.quantity > 0)
      .filter((item) => [item.name, item.brand, item.composition, item.batch].join(' ').toLowerCase().includes(query))
      .slice(0, 6);
  }

  get modalFilteredMedicines(): MedicineItem[] {
    const query = this.modalMedicineQuery.trim().toLowerCase();

    if (!query) {
      return this.medicines;
    }

    return this.medicines.filter((item) =>
      [item.name, item.brand, item.composition, item.batch, item.category]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  get modalTotalPages(): number {
    return Math.max(1, Math.ceil(this.modalFilteredMedicines.length / this.modalPageSize));
  }

  get modalPagedMedicines(): MedicineItem[] {
    const safePage = Math.min(this.modalPage, this.modalTotalPages);
    const start = (safePage - 1) * this.modalPageSize;
    return this.modalFilteredMedicines.slice(start, start + this.modalPageSize);
  }

  get hasSearchResults(): boolean {
    return this.medicineQuery.trim().length > 0 && this.filteredMedicines.length > 0;
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.medicine.price * item.qty, 0);
  }

  get canGenerateInvoice(): boolean {
    return this.cartItems.length > 0;
  }

  onMedicineSearch(value: string) {
    this.medicineQuery = value;
  }

  onModalMedicineSearch(value: string) {
    this.modalMedicineQuery = value;
    this.modalPage = 1;
  }

  openMedicinePickerModal() {
    this.isMedicinePickerOpen = true;
  }

  closeMedicinePickerModal() {
    this.isMedicinePickerOpen = false;
  }

  goToModalPage(page: number) {
    if (page < 1 || page > this.modalTotalPages) {
      return;
    }

    this.modalPage = page;
  }

  onCustomerPhoneChange(value: string) {
    this.customerPhone = value.replace(/\D/g, '').slice(0, 10);
    this.tryResolveCustomerProfile('phone');
  }

  onCustomerNameChange(value: string) {
    this.customerName = value;
    this.tryResolveCustomerProfile('name');
  }

  addMedicineToCart(medicine: MedicineItem) {
    const reserved = this.medicineService.decreaseStock(medicine.id, 1);
    if (!reserved) {
      return;
    }

    const existing = this.cartItems.find((item) => item.medicine.id === medicine.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cartItems = [...this.cartItems, { medicine, qty: 1 }];
    }

    this.medicineQuery = '';
  }

  incrementQty(item: CartItem) {
    const reserved = this.medicineService.decreaseStock(item.medicine.id, 1);
    if (!reserved) {
      return;
    }

    item.qty += 1;
  }

  decrementQty(item: CartItem) {
    this.medicineService.increaseStock(item.medicine.id, 1);

    if (item.qty <= 1) {
      this.cartItems = this.cartItems.filter((cartItem) => cartItem.medicine.id !== item.medicine.id);
      return;
    }

    item.qty -= 1;
  }

  generateInvoice() {
    if (this.cartItems.length === 0) {
      this.showInvoiceMessage('Add at least one medicine to generate invoice.', 'error');
      return;
    }

    const customerName = this.customerName.trim() || 'Walk-in Customer';
    const customerPhone = this.customerPhone.trim() || 'NA';
    const profile = this.resolveCustomerByInputs();
    const patientGender = profile?.gender || 'NA';
    const patientAge = profile?.age || 'NA';
    const doctorName = profile?.doctorName || 'NA';
    const referredBy = profile?.referredBy || 'Direct';

    const itemCount = this.cartItems.reduce((sum, item) => sum + item.qty, 0);
    const lineItems = this.cartItems.map((item) => ({
      medicineName: item.medicine.name,
      brand: item.medicine.brand,
      composition: item.medicine.composition,
      batch: item.medicine.batch,
      qty: item.qty,
      unitPrice: item.medicine.price,
      total: item.medicine.price * item.qty
    }));

    const invoicePayload = {
      customerName,
      customerPhone,
      patientGender,
      patientAge,
      doctorName,
      referredBy,
      amount: this.subtotal,
      itemCount,
      lineItems,
      date: new Date().toISOString()
    };
    this.invoiceService.createInvoiceViaApi(invoicePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice) => {
          const billedAmount = this.subtotal;
          this.syncCustomerPurchaseDetails(profile?.id ?? '', customerName, customerPhone, billedAmount, invoice.date);
          this.cartItems = [];
          this.medicineQuery = '';
          this.customerName = '';
          this.customerPhone = '';
          this.matchedCustomer = null;
          this.modalMedicineQuery = '';
          this.modalPage = 1;
          this.openMedicinePickerModal();
          this.notificationService.success('Billing Completed', `${invoice.id} created successfully.`);
          this.showInvoiceMessage(`${invoice.id} generated and synced.`, 'success');
        },
        error: () => {
          this.notificationService.error('Billing Failed', 'Failed to create invoice.');
          this.showInvoiceMessage('Failed to create invoice.', 'error');
        }
      });
  }

  printCurrentBill() {
    if (!this.canGenerateInvoice) {
      this.showInvoiceMessage('Add at least one medicine to print bill.', 'error');
      return;
    }

    this.printInvoice(this.buildDraftInvoiceForPrint());
  }

  private buildDraftInvoiceForPrint(): InvoiceItem {
    const customerName = this.customerName.trim() || 'Walk-in Customer';
    const customerPhone = this.customerPhone.trim() || 'NA';
    const profile = this.resolveCustomerByInputs();
    const now = new Date().toISOString();
    const tempId = `BILL-${Date.now().toString().slice(-6)}`;

    const receiptMeta = this.getReceiptMetaFromLogin();

    return {
      id: tempId,
      customerName,
      customerPhone,
      patientGender: profile?.gender || 'NA',
      patientAge: profile?.age || 'NA',
      doctorName: profile?.doctorName || receiptMeta.doctorName,
      referredBy: profile?.referredBy || receiptMeta.referredBy,
      amount: this.subtotal,
      itemCount: this.cartItems.reduce((sum, item) => sum + item.qty, 0),
      lineItems: this.cartItems.map((item) => ({
        medicineName: item.medicine.name,
        brand: item.medicine.brand,
        composition: item.medicine.composition,
        batch: item.medicine.batch,
        qty: item.qty,
        unitPrice: item.medicine.price,
        total: item.medicine.price * item.qty
      })),
      date: now
    };
  }

  private printInvoice(invoice: InvoiceItem): void {
      const receiptMeta = this.getReceiptMetaFromLogin();

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    const billDateValue = new Date(invoice.date);
    const printDateValue = new Date();
    const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const billDate = dateTimeFormatter.format(billDateValue).replace(',', '');
    const printDate = dateTimeFormatter.format(printDateValue).replace(',', '');

    const billNo = invoice.id;
    const mrNo = this.getDigits(invoice.customerPhone).slice(-5) || '22426';
    const machineNo = `${this.getDigits(invoice.id)}${this.getDigits(invoice.customerPhone)}`.padEnd(10, '0').slice(0, 10);
    const opNo = this.getDigits(invoice.id).slice(-5).padStart(5, '0');
    const tokenNo = String((Number(this.getDigits(invoice.id).slice(-2)) % 20) + 1);
    const amountInWords = this.toTitleCase(`${this.numberToWords(Math.round(invoice.amount))} only`);
    const patientGender = this.escapeHtml(invoice.patientGender || 'NA');
    const patientAge = this.escapeHtml(invoice.patientAge || 'NA');
    const doctorName = this.escapeHtml(invoice.doctorName || receiptMeta.doctorName);
    const referredBy = this.escapeHtml(invoice.referredBy || receiptMeta.referredBy);

    const patientName = this.escapeHtml(invoice.customerName || 'Walk-in Customer');
    const patientPhone = this.escapeHtml(invoice.customerPhone || 'NA');
    const escapedBillNo = this.escapeHtml(billNo);
    const escapedBillDate = this.escapeHtml(billDate);
    const escapedPrintDate = this.escapeHtml(printDate);
    const escapedAmountWords = this.escapeHtml(amountInWords);
    const escapedHospitalName = this.escapeHtml(receiptMeta.hospitalName);
    const escapedHospitalAddress = this.escapeHtml(receiptMeta.hospitalAddress);
    const escapedPhone = this.escapeHtml(receiptMeta.phoneNo);
    const escapedUrl = this.escapeHtml(receiptMeta.reportUrl);
    const escapedValidity = this.escapeHtml(receiptMeta.validityLabel);
    const escapedAuthorizedBy = this.escapeHtml(receiptMeta.authorizedBy);
    const escapedAmount = this.escapeHtml(invoice.amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
    const escapedItemCount = this.escapeHtml(String(invoice.itemCount));
    const escapedMachineNo = this.escapeHtml(machineNo);
    const escapedMrNo = this.escapeHtml(mrNo);
    const escapedOpNo = this.escapeHtml(opNo);
    const escapedTokenNo = this.escapeHtml(tokenNo);

    const medicineRows = (invoice.lineItems ?? [])
      .map((item, index) => {
        const medicineName = this.escapeHtml(item.medicineName || 'NA');
        const brand = this.escapeHtml(item.brand || 'NA');
        const composition = this.escapeHtml(item.composition || 'NA');
        const batch = this.escapeHtml(item.batch || 'NA');
        const qty = this.escapeHtml(String(item.qty ?? 0));
        const unitPrice = this.escapeHtml(
          Number(item.unitPrice ?? 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        );
        const total = this.escapeHtml(
          Number(item.total ?? 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        );

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${medicineName}</td>
            <td>${brand}</td>
            <td>${composition}</td>
            <td>${batch}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${total}</td>
          </tr>
        `;
      })
      .join('');

    const medicineDetailsSection = medicineRows
      ? `
        <div class="medicine-block">
          <div class="medicine-title">Medicine Details</div>
          <table class="medicine-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine Name</th>
                <th>Brand</th>
                <th>Composition</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${medicineRows}
            </tbody>
          </table>
        </div>
      `
      : '';

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapedBillNo}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Times New Roman", serif; color: #000; background: #fff; }
          .page { width: 100%; padding: 12mm; }
          .meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 6px; }
          .meta-row .report-url { font-size: 13px; text-align: right; max-width: 60%; }
          .receipt { border: 1px solid #000; border-radius: 10px; overflow: hidden; }
          .header { border-bottom: 1px solid #000; display: grid; grid-template-columns: 98px 1fr; gap: 10px; padding: 8px 10px; align-items: center; }
          .logo-box { width: 88px; height: 88px; border: 1px solid #000; border-radius: 4px; display: grid; place-items: center; font-size: 10px; text-align: center; font-weight: 700; }
          .hospital-name { margin: 0; text-align: center; letter-spacing: 0.04em; font-size: 40px; font-weight: 700; }
          .hospital-address, .hospital-phone { margin: 3px 0 0; text-align: center; font-size: 21px; line-height: 1.25; }
          .section-title { border-bottom: 1px solid #000; text-align: center; font-weight: 700; padding: 4px 10px; font-size: 30px; }
          .details { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000; }
          .details-col { padding: 8px 10px; }
          .details-col + .details-col { border-left: 1px solid #000; }
          .line { display: grid; grid-template-columns: 150px 10px 1fr; gap: 4px; align-items: baseline; margin: 2px 0; font-size: 26px; line-height: 1.35; }
          .line .k { font-weight: 700; }
          .amount-block { border-bottom: 1px solid #000; padding: 7px 10px; }
          .medicine-block { border-bottom: 1px solid #000; }
          .medicine-title { border-bottom: 1px solid #000; text-align: center; font-size: 26px; font-weight: 700; padding: 4px 8px; }
          .medicine-table { width: 100%; border-collapse: collapse; font-size: 16px; table-layout: fixed; }
          .medicine-table th, .medicine-table td { border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; text-align: left; overflow-wrap: anywhere; }
          .medicine-table th:last-child, .medicine-table td:last-child { border-right: 0; }
          .medicine-table tbody tr:last-child td { border-bottom: 0; }
          .medicine-table th { font-weight: 700; }
          .medicine-table th:nth-child(1), .medicine-table td:nth-child(1) { width: 34px; }
          .medicine-table th:nth-child(6), .medicine-table td:nth-child(6) { width: 52px; }
          .medicine-table th:nth-child(7), .medicine-table td:nth-child(7), .medicine-table th:nth-child(8), .medicine-table td:nth-child(8) { width: 86px; }
          .medicine-table td:nth-child(1), .medicine-table td:nth-child(6) { text-align: center; }
          .medicine-table td:nth-child(7), .medicine-table td:nth-child(8) { text-align: right; }
          .amount-line { display: grid; grid-template-columns: 230px 10px 1fr; gap: 4px; font-size: 25px; margin: 3px 0; }
          .footer { display: grid; grid-template-columns: 1fr 1fr; min-height: 92px; }
          .footer-left, .footer-right { padding: 8px 10px; }
          .footer-right { border-left: 1px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; }
          .signature-name { font-size: 27px; font-weight: 700; }
          .signature-label { font-size: 35px; font-weight: 700; margin-top: 2px; }
          @page { size: A4 landscape; margin: 10mm; }
          @media print { .page { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="meta-row">
            <div>${escapedPrintDate}</div>
            <div class="report-url">${escapedUrl}</div>
          </div>
          <div class="receipt">
            <div class="header">
              <div class="logo-box">AAROGYA<br />HOSPITAL</div>
              <div>
                <h1 class="hospital-name">${escapedHospitalName}</h1>
                <p class="hospital-address">${escapedHospitalAddress}</p>
                <p class="hospital-phone">Phone No : ${escapedPhone}</p>
              </div>
            </div>
            <div class="section-title">OP Consultation Receipt</div>
            <div class="details">
              <div class="details-col">
                <div class="line"><span class="k">Name</span><span>:</span><span>${patientName}</span></div>
                <div class="line"><span class="k">Gender</span><span>:</span><span>${patientGender}</span></div>
                <div class="line"><span class="k">Age</span><span>:</span><span>${patientAge}</span></div>
                <div class="line"><span class="k">Cons. Doc</span><span>:</span><span>${doctorName}</span></div>
                <div class="line"><span class="k">Paid Amt</span><span>:</span><span>${escapedAmount}</span></div>
                <div class="line"><span class="k">Refered By</span><span>:</span><span>${referredBy}</span></div>
              </div>
              <div class="details-col">
                <div class="line"><span class="k">BillDate</span><span>:</span><span>${escapedBillDate}</span></div>
                <div class="line"><span class="k">Bill No.</span><span>:</span><span>${escapedBillNo}</span></div>
                <div class="line"><span class="k">MR No.</span><span>:</span><span>${escapedMrNo}</span></div>
                <div class="line"><span class="k">Machine No</span><span>:</span><span>${escapedMachineNo}</span></div>
                <div class="line"><span class="k">OP No</span><span>:</span><span>${escapedOpNo}</span></div>
                <div class="line"><span class="k">Token No</span><span>:</span><span>${escapedTokenNo}</span></div>
              </div>
            </div>
            ${medicineDetailsSection}
            <div class="amount-block">
              <div class="amount-line"><span><b>(In Words)</b></span><span>:</span><span>${escapedAmountWords}</span></div>
              <div class="amount-line"><span><b>Patient Phone</b></span><span>:</span><span>${patientPhone}</span></div>
              <div class="amount-line"><span><b>Items</b></span><span>:</span><span>${escapedItemCount}</span></div>
            </div>
            <div class="footer">
              <div class="footer-left">
                <div style="font-size: 24px;"><b>${escapedValidity}</b></div>
                <div style="font-size: 24px; margin-top: 7px;"><b>PrintDate</b> : ${escapedPrintDate}</div>
              </div>
              <div class="footer-right">
                <div class="signature-name">${escapedAuthorizedBy}</div>
                <div class="signature-label">Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private numberToWords(amount: number): string {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) {
      return 'Rupees zero';
    }

    const ones = [
      '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
      'seventeen', 'eighteen', 'nineteen'
    ];

    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const belowHundred = (value: number): string => {
      if (value < 20) {
        return ones[value];
      }
      const tenPart = tens[Math.floor(value / 10)];
      const onePart = ones[value % 10];
      return onePart ? `${tenPart} ${onePart}` : tenPart;
    };

    const belowThousand = (value: number): string => {
      const hundredPart = Math.floor(value / 100);
      const remainder = value % 100;
      const hundredText = hundredPart ? `${ones[hundredPart]} hundred` : '';
      const remainderText = remainder ? belowHundred(remainder) : '';
      return `${hundredText} ${remainderText}`.trim();
    };

    const crore = Math.floor(safeAmount / 10000000);
    const lakh = Math.floor((safeAmount % 10000000) / 100000);
    const thousand = Math.floor((safeAmount % 100000) / 1000);
    const rest = safeAmount % 1000;

    const parts: string[] = [];
    if (crore) {
      parts.push(`${belowThousand(crore)} crore`);
    }
    if (lakh) {
      parts.push(`${belowThousand(lakh)} lakh`);
    }
    if (thousand) {
      parts.push(`${belowThousand(thousand)} thousand`);
    }
    if (rest) {
      parts.push(belowThousand(rest));
    }

    return `Rupees ${parts.join(' ')}`.replace(/\s+/g, ' ').trim();
  }

  private syncCustomerPurchaseDetails(
    customerId: string,
    customerName: string,
    customerPhone: string,
    billedAmount: number,
    visitedAt: string
  ) {
    if (!customerPhone || customerPhone === 'NA') {
      return;
    }

    if (!customerId.trim()) {
      this.customerService.recordPurchase({
        name: customerName,
        phone: customerPhone,
        amount: billedAmount,
        date: visitedAt
      });
      return;
    }

    const storeDetails = this.getMedicalStoreDetails();
    if (!storeDetails.email || !storeDetails.storeMobile || !storeDetails.storeId) {
      this.customerService.recordPurchase({
        name: customerName,
        phone: customerPhone,
        amount: billedAmount,
        date: visitedAt
      });
      return;
    }

    this.customerService
      .updateCustomerPurchaseDetails({
        customerId,
        name: customerName,
        phone: customerPhone,
        spent: billedAmount,
        visited: visitedAt,
        ...storeDetails
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.customerService.recordPurchase({
            name: customerName,
            phone: customerPhone,
            amount: billedAmount,
            date: visitedAt
          });
        }
      });
  }

  private getMedicalStoreDetails(): {
    storeMobile: string;
    email: string;
    storeId: string;
  } {
    const response = this.authService.loginResponse;
    const source = this.extractSource(response);

    return {
      storeMobile: this.pickValue(source, ['storeMobile', 'mobile', 'phone', 'mobileNo']),
      email: this.pickValue(source, ['email', 'mailId', 'storeEmail']),
      storeId: this.pickValue(source, ['storeId'])
    };
  }

  private extractSource(payload: unknown): Record<string, unknown> {
    if (!payload) {
      return {};
    }

    if (typeof payload === 'string') {
      try {
        return this.extractSource(JSON.parse(payload));
      } catch {
        return {};
      }
    }

    if (typeof payload !== 'object') {
      return {};
    }

    const record = payload as Record<string, unknown>;
    const nestedData = record['data'];

    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }

    return record;
  }

  private pickValue(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }

  private tryResolveCustomerProfile(source: 'phone' | 'name') {
    const resolved = this.resolveCustomerByInputs();
    this.matchedCustomer = resolved;

    if (!resolved) {
      return;
    }

    if (source === 'phone' && !this.customerName.trim()) {
      this.customerName = resolved.name;
    }

    if (source === 'name' && !this.customerPhone.trim()) {
      this.customerPhone = resolved.phone;
    }
  }

  private resolveCustomerByInputs(): CustomerItem | null {
    const phone = this.customerPhone.trim();
    if (phone) {
      const byPhone = this.customerService.findByPhone(phone);
      if (byPhone) {
        return byPhone;
      }
    }

    const name = this.customerName.trim();
    if (!name) {
      return null;
    }

    return this.customerService.findByName(name);
  }

  private showInvoiceMessage(message: string, type: 'success' | 'error') {
    this.invoiceMessage = message;
    this.invoiceMessageType = type;

    setTimeout(() => {
      this.invoiceMessage = '';
    }, 1800);
  }

  trackByMedicineId(_index: number, item: MedicineItem) {
    return item.id;
  }

  trackByCartMedicineId(_index: number, item: CartItem) {
    return item.medicine.id;
  }
}
