import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tracker/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'habits',
    loadComponent: () =>
      import('./habit/habit-list/habit-list.component').then((m) => m.HabitListComponent)
  },
  {
    path: 'habits/:id',
    loadComponent: () =>
      import('./habit/habit-detail/habit-detail.component').then((m) => m.HabitDetailComponent)
  },
  {
    path: 'add-habit',
    loadComponent: () =>
      import('./habit/habit-form/habit-form.component').then((m) => m.HabitFormComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then((m) => m.ReportsComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
