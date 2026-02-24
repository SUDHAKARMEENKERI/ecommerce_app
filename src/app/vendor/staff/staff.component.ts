import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type StaffStatus = 'Active' | 'On Leave' | 'Inactive';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  shift: string;
  status: StaffStatus;
};

@Component({
  selector: 'app-vendor-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.scss']
})
export class VendorStaffComponent {
  searchText = '';
  selectedStatus: StaffStatus | 'All' = 'All';

  staffMembers: StaffMember[] = [
    { id: 'ST-001', name: 'Anita Sharma', role: 'Pharmacist', phone: '9876543210', shift: 'Morning', status: 'Active' },
    { id: 'ST-002', name: 'Rahul Verma', role: 'Billing Executive', phone: '9988776655', shift: 'Evening', status: 'Active' },
    { id: 'ST-003', name: 'Meena R', role: 'Inventory Manager', phone: '9123456780', shift: 'General', status: 'On Leave' },
    { id: 'ST-004', name: 'Kiran Das', role: 'Store Assistant', phone: '9090909090', shift: 'Morning', status: 'Inactive' }
  ];

  get totalStaff(): number {
    return this.staffMembers.length;
  }

  get activeStaff(): number {
    return this.staffMembers.filter((item) => item.status === 'Active').length;
  }

  get onLeaveStaff(): number {
    return this.staffMembers.filter((item) => item.status === 'On Leave').length;
  }

  get visibleStaff(): StaffMember[] {
    const query = this.searchText.trim().toLowerCase();

    return this.staffMembers.filter((item) => {
      const statusMatch = this.selectedStatus === 'All' || item.status === this.selectedStatus;
      const searchMatch = !query || [item.name, item.role, item.phone, item.id].join(' ').toLowerCase().includes(query);
      return statusMatch && searchMatch;
    });
  }

  setStatusFilter(status: StaffStatus | 'All') {
    this.selectedStatus = status;
  }

  trackByStaffId(_index: number, item: StaffMember) {
    return item.id;
  }
}
