import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'mailboxes',
    pathMatch: 'full',
  },
  {
    path: 'mailboxes',
    loadComponent: () =>
      import('./mailbox/mailbox-management.component').then(
        (m) => m.MailboxManagementComponent,
      ),
    title: 'Mailbox Beheer',
  },
  {
    path: '**',
    redirectTo: 'mailboxes',
  },
];
