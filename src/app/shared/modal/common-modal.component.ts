import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-common-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './common-modal.component.html',
  styleUrls: ['./common-modal.component.scss']
})
export class CommonModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Message';
  @Input() message = '';

  @Output() closed = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  onClose() {
    this.closed.emit();
  }
}
