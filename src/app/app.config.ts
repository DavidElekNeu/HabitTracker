import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { DBConfig, NgxIndexedDBModule } from 'ngx-indexed-db';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

export const HABIT_TRACKER_DB_CONFIG: DBConfig = {
  name: 'HabitTrackerDB',
  version: 2,
  objectStoresMeta: [
    {
      store: 'habits',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [
        { name: 'title', keypath: 'title', options: { unique: false } },
        { name: 'type', keypath: 'type', options: { unique: false } },
        { name: 'strategyType', keypath: 'strategyType', options: { unique: false } },
        { name: 'createdDate', keypath: 'createdDate', options: { unique: false } },
        { name: 'archived', keypath: 'archived', options: { unique: false } }
      ]
    },
    {
      store: 'logs',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [
        { name: 'habitId', keypath: 'habitId', options: { unique: false } },
        { name: 'date', keypath: 'date', options: { unique: false } },
        { name: 'dayKey', keypath: 'dayKey', options: { unique: false } },
        { name: 'habitDayKey', keypath: 'habitDayKey', options: { unique: true } },
        { name: 'synced', keypath: 'synced', options: { unique: false } }
      ]
    },
    {
      store: 'settings',
      storeConfig: { keyPath: 'id', autoIncrement: true },
      storeSchema: [{ name: 'key', keypath: 'key', options: { unique: true } }]
    }
  ],
  migrationFactory: () => ({
    2: (_db: IDBDatabase, transaction?: IDBTransaction) => {
      if (!transaction) {
        return;
      }
      const logsStore = transaction.objectStore('logs');
      if (!logsStore.indexNames.contains('dayKey')) {
        logsStore.createIndex('dayKey', 'dayKey', { unique: false });
      }
      if (!logsStore.indexNames.contains('habitDayKey')) {
        logsStore.createIndex('habitDayKey', 'habitDayKey', { unique: true });
      }
    }
  })
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes, withComponentInputBinding()),
    provideAnimations(),
    importProvidersFrom(NgxIndexedDBModule.forRoot(HABIT_TRACKER_DB_CONFIG)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
