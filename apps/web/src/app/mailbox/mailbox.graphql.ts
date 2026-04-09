import { gql } from 'apollo-angular';

export const GET_MAILBOXES = gql`
  query GetMailboxes {
    mailboxes {
      id
      email
      provider
      status
      lastSyncAt
      createdAt
    }
  }
`;

export const CONNECT_MAILBOX = gql`
  mutation ConnectMailbox($input: ConnectMailboxInput!) {
    connectMailbox(input: $input) {
      id
      email
      provider
      status
      createdAt
    }
  }
`;

export const DISCONNECT_MAILBOX = gql`
  mutation DisconnectMailbox($id: ID!) {
    disconnectMailbox(id: $id) {
      id
      status
    }
  }
`;

export const GET_OAUTH_URL = gql`
  query GetOAuthUrl($provider: MailboxProvider!) {
    oauthUrl(provider: $provider)
  }
`;
