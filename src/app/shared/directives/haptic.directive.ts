import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appHaptic]',
  standalone: true
})
export class HapticDirective {
  @Input('appHaptic') pattern: number | number[] | undefined;

  @HostListener('click')
  @HostListener('keydown.enter')
  @HostListener('keydown.space')
  triggerVibration(): void {
    if (!('vibrate' in navigator)) {
      return;
    }
    navigator.vibrate?.(this.pattern ?? 15);
  }
}
