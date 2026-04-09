import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MailboxService } from './mailbox.service';
import type { MailboxProvider } from './mailbox.types';

@Component({
  selector: 'app-mailbox-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mailbox-management.component.html',
  styleUrl: './mailbox-management.component.scss',
})
export class MailboxManagementComponent implements OnInit {
  protected readonly mailboxService = inject(MailboxService);
  private readonly route = inject(ActivatedRoute);

  protected readonly showImapForm = signal(false);
  protected readonly imapEmail = signal('');
  protected readonly confirmDisconnectId = signal<string | null>(null);

  protected readonly providers: { id: MailboxProvider; label: string; icon: string }[] = [
    { id: 'gmail', label: 'Gmail', icon: '📧' },
    { id: 'outlook', label: 'Microsoft 365 / Outlook', icon: '📨' },
    { id: 'imap', label: 'Generiek IMAP', icon: '📮' },
  ];

  protected readonly canSubmitImap = computed(
    () => this.imapEmail().trim().length > 0 && !this.mailboxService.loading(),
  );

  ngOnInit(): void {
    this.mailboxService.loadMailboxes();
    this.handleOAuthCallback();
  }

  private handleOAuthCallback(): void {
    const params = this.route.snapshot.queryParams;
    const code = params['code'] as string | undefined;
    const provider = params['provider'] as MailboxProvider | undefined;

    if (code && provider) {
      this.mailboxService.handleOAuthCallback(code, provider);
    }
  }

  protected connectOAuth(provider: MailboxProvider): void {
    this.mailboxService.initiateOAuth(provider);
  }

  protected toggleImapForm(): void {
    this.showImapForm.update((v) => !v);
    this.imapEmail.set('');
  }

  protected submitImapForm(): void {
    const email = this.imapEmail().trim();
    if (!email) return;
    this.mailboxService.connectImapMailbox(email);
    this.showImapForm.set(false);
    this.imapEmail.set('');
  }

  protected requestDisconnect(id: string): void {
    this.confirmDisconnectId.set(id);
  }

  protected confirmDisconnect(): void {
    const id = this.confirmDisconnectId();
    if (id) {
      this.mailboxService.disconnectMailbox(id);
      this.confirmDisconnectId.set(null);
    }
  }

  protected cancelDisconnect(): void {
    this.confirmDisconnectId.set(null);
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      connected: 'Verbonden',
      disconnected: 'Verbroken',
      error: 'Fout',
      pending: 'In afwachting',
    };
    return map[status] ?? status;
  }

  protected providerLabel(provider: string): string {
    return this.providers.find((p) => p.id === provider)?.label ?? provider;
  }
}
