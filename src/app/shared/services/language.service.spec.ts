import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  const storageKey = 'striveup-language';

  afterEach(() => {
    localStorage.removeItem(storageKey);
    document.documentElement.lang = '';
    TestBed.resetTestingModule();
  });

  it('defaults to Hungarian and can restore every translated node to English', () => {
    localStorage.removeItem(storageKey);
    const service = TestBed.inject(LanguageService);
    const root = document.createElement('div');
    root.innerHTML = '<h2>Settings</h2><input placeholder="Search habits…"><button aria-label="Add new habit">Today</button>';

    service.connect(root);
    expect(root.textContent).toContain('Beállítások');
    expect(root.textContent).toContain('Ma');
    expect(root.querySelector('input')?.placeholder).toBe('Szokások keresése…');
    expect(root.querySelector('button')?.getAttribute('aria-label')).toBe('Új szokás hozzáadása');

    service.setLanguage('en');
    expect(root.textContent).toContain('Settings');
    expect(root.textContent).toContain('Today');
    expect(root.querySelector('input')?.placeholder).toBe('Search habits…');
    expect(localStorage.getItem(storageKey)).toBe('en');
    service.disconnect();
  });

  it('loads a saved English preference', () => {
    localStorage.setItem(storageKey, 'en');
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
