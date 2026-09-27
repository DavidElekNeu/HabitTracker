import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({ name: 'localizedDate', standalone: true, pure: false })
export class LocalizedDatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(value: Date | string | number | null | undefined, format = 'mediumDate'): string {
    if (value === null || value === undefined || value === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const locale = this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US';
    if (format === 'shortTime') return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    if (format === 'M/d') return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
