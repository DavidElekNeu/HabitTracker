import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="space-y-2">
      <p *ngIf="eyebrow" class="text-xs uppercase tracking-wide text-slate-500">{{ eyebrow }}</p>
      <h1 class="text-2xl font-semibold sm:text-3xl">{{ title }}</h1>
      <p *ngIf="subtitle" class="text-sm text-slate-500">{{ subtitle }}</p>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() eyebrow?: string;
}
