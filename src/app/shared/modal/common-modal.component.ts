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
  private readonly viewportPadding = 12;
  private readonly modalHalfWidth = 180;
  private readonly modalHalfHeight = 130;

  @Input() isOpen = false;
  @Input() title = 'Message';
  @Input() message = '';
  @Input() variant: 'default' | 'success' | 'error' = 'default';
  @Input() actionLabel = 'OK';
  @Input() allowBackdropClose = true;
  @Input() anchorPoint: { x: number; y: number } | null = null;

  @Output() action = new EventEmitter<void>();
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
    this.action.emit();
    this.closed.emit();
  }

  get modalStyle(): Record<string, string> | null {
    if (!this.anchorPoint) {
      return null;
    }

    const view = this.documentRef.defaultView;
    const viewportWidth = view?.innerWidth ?? 1280;
    const viewportHeight = view?.innerHeight ?? 720;

    const minX = this.viewportPadding + this.modalHalfWidth;
    const maxX = viewportWidth - this.viewportPadding - this.modalHalfWidth;
    const minY = this.viewportPadding + this.modalHalfHeight;
    const maxY = viewportHeight - this.viewportPadding - this.modalHalfHeight;

    const safeLeft = maxX < minX ? viewportWidth / 2 : this.clamp(this.anchorPoint.x, minX, maxX);
    const safeTop = maxY < minY ? viewportHeight / 2 : this.clamp(this.anchorPoint.y, minY, maxY);

    return {
      left: `${safeLeft}px`,
      top: `${safeTop}px`,
      transform: 'translate(-50%, -50%)'
    };
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

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
