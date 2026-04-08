import { ApplicationConfig } from '@angular/core';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { inject } from '@angular/core';

export const GRAPHQL_URI = '/graphql';

export function apolloOptionsFactory(): ApolloClientOptions<unknown> {
  const httpLink = inject(HttpLink);
  return {
    link: httpLink.create({ uri: GRAPHQL_URI }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  };
}

export const apolloProviders: ApplicationConfig['providers'] = [
  { provide: APOLLO_OPTIONS, useFactory: apolloOptionsFactory },
];
