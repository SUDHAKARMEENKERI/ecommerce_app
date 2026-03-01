import { Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-common-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './common-modal.component.html',
  styleUrls: ['./common-modal.component.scss']
})
export class CommonModalComponent implements OnChanges, OnDestroy {
  private static openModalCount = 0;
  private static lockedScrollY = 0;

  @Input() isOpen = false;
  @Input() title = 'Message';
  @Input() message = '';
  @Input() variant: 'default' | 'success' | 'error' = 'default';
  @Input() actionLabel = 'OK';
  @Input() allowBackdropClose = true;

  @Output() closed = new EventEmitter<void>();

  private lockApplied = false;

  constructor(@Inject(DOCUMENT) private documentRef: Document) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!('isOpen' in changes)) {
      return;
    }

    if (this.isOpen) {
      this.lockBodyScroll();
      return;
    }

    this.unlockBodyScroll();
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
  }

  onBackdropClick(event: MouseEvent) {
    if (this.allowBackdropClose && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  onClose() {
    this.closed.emit();
  }

  private lockBodyScroll() {
    if (this.lockApplied) {
      return;
    }

    this.lockApplied = true;
    CommonModalComponent.openModalCount += 1;

    if (CommonModalComponent.openModalCount === 1) {
      const currentScrollY =
        this.documentRef.defaultView?.scrollY ??
        this.documentRef.documentElement.scrollTop ??
        this.documentRef.body.scrollTop ??
        0;

      CommonModalComponent.lockedScrollY = currentScrollY;

      this.documentRef.body.style.overflow = 'hidden';
      this.documentRef.body.style.position = 'fixed';
      this.documentRef.body.style.top = `-${currentScrollY}px`;
      this.documentRef.body.style.left = '0';
      this.documentRef.body.style.right = '0';
      this.documentRef.body.style.width = '100%';
    }
  }

  private unlockBodyScroll() {
    if (!this.lockApplied) {
      return;
    }

    this.lockApplied = false;
    CommonModalComponent.openModalCount = Math.max(0, CommonModalComponent.openModalCount - 1);

    if (CommonModalComponent.openModalCount === 0) {
      this.documentRef.body.style.overflow = '';
      this.documentRef.body.style.position = '';
      this.documentRef.body.style.top = '';
      this.documentRef.body.style.left = '';
      this.documentRef.body.style.right = '';
      this.documentRef.body.style.width = '';

      this.documentRef.defaultView?.scrollTo({
        top: CommonModalComponent.lockedScrollY,
        left: 0,
        behavior: 'auto'
      });
    }
  }
}
