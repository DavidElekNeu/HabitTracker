import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appSwipeAction]',
  standalone: true
})
export class SwipeActionDirective {
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();

  private pointerDownX: number | null = null;
  private pointerDownY: number | null = null;
  private readonly threshold = 60;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.pointerDownX === null || this.pointerDownY === null) {
      return;
    }
    const deltaX = event.clientX - this.pointerDownX;
    const deltaY = Math.abs(event.clientY - this.pointerDownY);

    if (Math.abs(deltaX) > this.threshold && deltaY < this.threshold) {
      if (deltaX > 0) {
        this.swipeRight.emit();
      } else {
        this.swipeLeft.emit();
      }
    }

    this.pointerDownX = null;
    this.pointerDownY = null;
  }
}
