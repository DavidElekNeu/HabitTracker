import { registerPlugin } from '@capacitor/core';

export const DailyLessons = registerPlugin<{
  configure(options: { enabled: boolean }): Promise<void>;
  setLanguage(options: { language: 'hu' | 'en' }): Promise<void>;
}>('DailyLessons');
