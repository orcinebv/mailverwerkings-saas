import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { APP_ROUTES } from './app.routes';
import { jwtInterceptor } from './auth/jwt.interceptor';
import { apolloProviders } from './graphql/graphql.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor]), withFetch()),
    provideAnimations(),
    ...apolloProviders,
  ],
};
