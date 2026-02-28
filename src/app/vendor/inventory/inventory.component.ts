import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MedicineItem, MedicineService } from '../services/medicine.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type InventoryTab = 'all' | 'low-stock' | 'out-of-stock' | 'expiring' | 'expired';

type InventoryColumnKey =
  | 'name'
  | 'brand'
  | 'composition'
  | 'category'
  | 'batch'
  | 'expiry'
  | 'quantity'
  | 'price'
  | 'status';

type SortDirection = 'asc' | 'desc';

type InventoryItem = MedicineItem;

type InventoryColumn = {
  key: InventoryColumnKey;
  label: string;
  width: string;
  sortable?: boolean;
  visible: boolean;
};

@Component({
  selector: 'app-vendor-inventory',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class VendorInventoryComponent {
    // Pagination state
    currentPage = 1;
    pageSize = 10;
    get totalPages(): number {
      return Math.ceil(this.sortedItems.length / this.pageSize) || 1;
    }

    get pagedItems(): InventoryItem[] {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.sortedItems.slice(start, start + this.pageSize);
    }

    // Sorting logic for enhanced table
    onSort(colKey: InventoryColumnKey) {
      if (this.sortColumn === colKey) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = colKey;
        this.sortDirection = 'asc';
      }
      this.currentPage = 1;
    }

    get sortedItems(): InventoryItem[] {
      const items = [...this.visibleItems];
      const col = this.sortColumn;
      const dir = this.sortDirection;
      return items.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];
        if (col === 'expiry') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    goToPage(page: number) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
    }
  private route = inject(ActivatedRoute);
  private medicineService = inject(MedicineService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.medicineService.medicines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((medicines) => {
        this.items = medicines;
      });

    this.medicineService
      .loadMedicinesFromApi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  title$ = this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Inventory'));

  tabs: { key: InventoryTab; label: string }[] = [
    { key: 'all', label: 'All Medicines' },
    { key: 'low-stock', label: 'Low Stock' },
    { key: 'out-of-stock', label: 'Out of Stock' },
    { key: 'expiring', label: 'Expiring' },
    { key: 'expired', label: 'Expired' }
  ];

  activeTab: InventoryTab = 'all';
  searchText = '';
  showColumnsMenu = false;
  selectedIds = new Set<string>();
  sortColumn: InventoryColumnKey = 'name';
  sortDirection: SortDirection = 'asc';

  columns: InventoryColumn[] = [
    { key: 'name', label: 'Name', width: '1.3fr', sortable: true, visible: true },
    { key: 'brand', label: 'Brand', width: '0.9fr', visible: true },
    { key: 'composition', label: 'Composition', width: '1.2fr', visible: true },
    { key: 'category', label: 'Category', width: '0.9fr', visible: true },
    { key: 'batch', label: 'Batch', width: '0.7fr', visible: true },
    { key: 'expiry', label: 'Expiry', width: '0.8fr', sortable: true, visible: true },
    { key: 'quantity', label: 'Quantity', width: '0.9fr', sortable: true, visible: true },
    { key: 'price', label: 'Price', width: '0.7fr', sortable: true, visible: true },
    { key: 'status', label: 'Status', width: '0.8fr', visible: true }
  ];

  items: InventoryItem[] = this.medicineService.getMedicines();
    // Export inventory to CSV
    exportInventory() {
      const headers = ['Name', 'Brand', 'Composition', 'Category', 'Batch', 'Expiry', 'Quantity', 'Price', 'Status'];
      const rows = this.visibleItems.map(item => [
        item.name,
        item.brand,
        item.composition,
        item.category,
        item.batch,
        item.expiry,
        item.quantity,
        item.price,
        item.status
      ]);
      const csv = [headers, ...rows].map(row => row.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }

    // Import inventory from CSV
    importInventory(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      this.medicineService.bulkUploadExcel(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => {
            if (result.success) {
              window.alert(`Bulk upload successful. ${result.count} items uploaded.`);
              this.medicineService.loadMedicinesFromApi().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
            } else {
              window.alert('Bulk upload failed.');
            }
          },
          error: () => {
            window.alert('Bulk upload failed.');
          }
        });
      input.value = '';
    }
    getStatusClass(status: string): string {
      return 'status-badge status-' + (status ? status.toLowerCase().split(' ').join('-') : '');
    }

  get visibleItems(): InventoryItem[] {
    const query = this.searchText.trim().toLowerCase();

    const filteredItems = this.items.filter((item) => {
      const matchesTab = this.matchesTab(item, this.activeTab);
      const matchesSearch =
        !query ||
        [item.name, item.brand, item.composition, item.category, item.batch, item.status]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesTab && matchesSearch;
    });

    return [...filteredItems].sort((left, right) => this.compareItems(left, right));
  }

  get visibleColumns(): InventoryColumn[] {
    return this.columns.filter((column) => column.visible);
  }

  get gridTemplateColumns(): string {
    return ['44px', ...this.visibleColumns.map((column) => column.width)].join(' ');
  }

  get selectedCount(): number {
    return this.visibleItems.filter((item) => this.selectedIds.has(item.id)).length;
  }

  get allVisibleSelected(): boolean {
    return this.visibleItems.length > 0 && this.visibleItems.every((item) => this.selectedIds.has(item.id));
  }

  get hasSomeVisibleSelected(): boolean {
    return this.selectedCount > 0 && !this.allVisibleSelected;
  }

  selectTab(tab: InventoryTab) {
    this.activeTab = tab;
  }

  onSearch(value: string) {
    this.searchText = value;
    this.currentPage = 1;
  }

  toggleColumnsMenu() {
    this.showColumnsMenu = !this.showColumnsMenu;
  }

  toggleColumn(columnKey: InventoryColumnKey) {
    const column = this.columns.find((item) => item.key === columnKey);
    if (!column) {
      return;
    }

    if (column.visible && this.visibleColumns.length === 1) {
      return;
    }

    column.visible = !column.visible;

    if (!column.visible && this.sortColumn === column.key) {
      this.sortColumn = 'name';
      this.sortDirection = 'asc';
    }
  }

  toggleSort(columnKey: InventoryColumnKey) {
    const column = this.columns.find((item) => item.key === columnKey);
    if (!column?.sortable) {
      return;
    }

    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortColumn = columnKey;
    this.sortDirection = 'asc';
  }

  getSortIcon(columnKey: InventoryColumnKey): string {
    if (this.sortColumn !== columnKey) {
      return 'bi-arrow-down-up';
    }

    return this.sortDirection === 'asc' ? 'bi-sort-down-alt' : 'bi-sort-down';
  }

  toggleRowSelection(itemId: string, checked: boolean) {
    if (checked) {
      this.selectedIds.add(itemId);
      return;
    }

    this.selectedIds.delete(itemId);
  }

  toggleSelectAll(checked: boolean) {
    if (checked) {
      this.visibleItems.forEach((item) => this.selectedIds.add(item.id));
      return;
    }

    this.visibleItems.forEach((item) => this.selectedIds.delete(item.id));
  }

  isRowSelected(itemId: string): boolean {
    return this.selectedIds.has(itemId);
  }

  trackByItemId(_index: number, item: InventoryItem) {
    return item.id;
  }

  trackByColumnKey(_index: number, column: InventoryColumn) {
    return column.key;
  }

  getColumnValue(item: InventoryItem, columnKey: InventoryColumnKey): string | number {
    if (columnKey === 'expiry') {
      return item.expiry;
    }

    if (columnKey === 'price') {
      return item.price;
    }

    if (columnKey === 'quantity') {
      return item.quantity;
    }

    return item[columnKey];
  }

  private matchesTab(item: InventoryItem, tab: InventoryTab): boolean {
    const now = new Date();
    const expiryDate = new Date(item.expiry);
    const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (tab === 'all') {
      return true;
    }

    if (tab === 'low-stock') {
      return item.quantity > 0 && item.quantity <= 10;
    }

    if (tab === 'out-of-stock') {
      return item.quantity === 0;
    }

    if (tab === 'expiring') {
      return daysToExpiry >= 0 && daysToExpiry <= 30;
    }

    return expiryDate < now;
  }

  private compareItems(left: InventoryItem, right: InventoryItem): number {
    const multiplier = this.sortDirection === 'asc' ? 1 : -1;

    if (this.sortColumn === 'price') {
      return (left.price - right.price) * multiplier;
    }

    if (this.sortColumn === 'expiry') {
      return (new Date(left.expiry).getTime() - new Date(right.expiry).getTime()) * multiplier;
    }

    if (this.sortColumn === 'quantity') {
      return (left.quantity - right.quantity) * multiplier;
    }

    return left.name.localeCompare(right.name) * multiplier;
  }
}