import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div>
      <div
        class="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        [attr.aria-labelledby]="ariaLabelId"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="safeMax"
        [attr.aria-valuenow]="ariaValueNow"
      >
        <div
          class="progress-fill h-full rounded-full will-change-[width]"
          [class.pulse-once]="shouldPulse"
          [style.width.%]="percent"
        ></div>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 select-none">
          {{ displayLabel }}
        </div>
      </div>
      <span class="sr-only" [id]="ariaLabelId">{{ srLabel }}</span>
    </div>
  `,
  styles: [
    `
    .progress-fill {
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      transition: width 600ms cubic-bezier(.2,.7,.2,1);
    }
    @media (prefers-reduced-motion: reduce) {
      .progress-fill { transition: none; }
      .pulse-once { animation: none !important; }
    }
    .pulse-once {
      animation: bar-pulse 450ms ease-out 1;
    }
    @keyframes bar-pulse {
      0% { transform: scaleY(1); }
      40% { transform: scaleY(1.05); }
      100% { transform: scaleY(1); }
    }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent implements OnChanges {
  @Input() value = 0; // current value
  @Input() max = 100; // maximum value
  @Input() srLabel = 'Progress';

  ariaLabelId = `pb_${Math.random().toString(36).slice(2)}`;
  shouldPulse = false;
  private lastPercent = 0;

  get safeMax(): number {
    const m = Number(this.max);
    return Number.isFinite(m) && m > 0 ? m : 1;
  }

  private get sanitizedValue(): number {
    const v = Number(this.value);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, v);
  }

  get clampedValue(): number {
    const safe = this.safeMax;
    return Math.min(this.sanitizedValue, safe);
  }

  get percent(): number {
    return (this.clampedValue / this.safeMax) * 100;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['max']) {
      const next = this.percent;
      // Fire a one-time pulse when first reaching/surpassing 100%
      if (this.lastPercent < 100 && next >= 100) {
        this.shouldPulse = true;
        setTimeout(() => (this.shouldPulse = false), 500);
      }
      this.lastPercent = next;
    }
  }

  get ariaValueNow(): number {
    return Math.round(this.clampedValue);
  }

  get displayLabel(): string {
    // Show raw (unclamped) current for over‑goal like 4/3
    return `${this.format(this.sanitizedValue)} / ${this.format(this.safeMax)}`;
  }

  private format(n: number): string {
    const v = Number(n);
    if (!Number.isFinite(v)) {
      return '0';
    }
    const rounded1 = Math.round(v * 10) / 10;
    // Show no decimals for whole numbers
    return Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
  }
}
