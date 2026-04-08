import { Injectable, inject, signal, computed } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import type { Mailbox, MailboxProvider } from './mailbox.types';
import {
  GET_MAILBOXES,
  CONNECT_MAILBOX,
  DISCONNECT_MAILBOX,
  GET_OAUTH_URL,
} from './mailbox.graphql';

@Injectable({ providedIn: 'root' })
export class MailboxService {
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);

  private readonly _mailboxes = signal<Mailbox[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly mailboxes = this._mailboxes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly connectedCount = computed(
    () => this._mailboxes().filter((m) => m.status === 'connected').length,
  );

  loadMailboxes(): void {
    this._loading.set(true);
    this._error.set(null);

    this.apollo
      .watchQuery<{ mailboxes: Mailbox[] }>({ query: GET_MAILBOXES })
      .valueChanges.pipe(
        map((result) => result.data.mailboxes),
        tap(() => this._loading.set(false)),
      )
      .subscribe({
        next: (mailboxes) => this._mailboxes.set(mailboxes),
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  initiateOAuth(provider: MailboxProvider): void {
    this._loading.set(true);

    this.apollo
      .query<{ oauthUrl: string }>({
        query: GET_OAUTH_URL,
        variables: { provider },
      })
      .pipe(map((result) => result.data.oauthUrl))
      .subscribe({
        next: (url) => {
          this._loading.set(false);
          window.location.href = url;
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  connectImapMailbox(email: string): void {
    this._loading.set(true);
    this._error.set(null);

    this.apollo
      .mutate<{ connectMailbox: Mailbox }>({
        mutation: CONNECT_MAILBOX,
        variables: { input: { email, provider: 'imap' } },
        refetchQueries: [{ query: GET_MAILBOXES }],
      })
      .pipe(map((result) => result.data?.connectMailbox))
      .subscribe({
        next: () => this._loading.set(false),
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  disconnectMailbox(id: string): void {
    this._loading.set(true);

    this.apollo
      .mutate({
        mutation: DISCONNECT_MAILBOX,
        variables: { id },
        refetchQueries: [{ query: GET_MAILBOXES }],
      })
      .subscribe({
        next: () => this._loading.set(false),
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }

  handleOAuthCallback(code: string, provider: MailboxProvider): void {
    this._loading.set(true);
    this._error.set(null);

    this.apollo
      .mutate<{ connectMailbox: Mailbox }>({
        mutation: CONNECT_MAILBOX,
        variables: { input: { oauthCode: code, provider } },
        refetchQueries: [{ query: GET_MAILBOXES }],
      })
      .subscribe({
        next: () => {
          this._loading.set(false);
          void this.router.navigate(['/mailboxes']);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._loading.set(false);
        },
      });
  }
}
