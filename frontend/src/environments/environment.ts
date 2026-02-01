export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:4200',
  github: {
    clientId: '', // Will be set from backend or .env
    redirectUri: 'http://localhost:4200/auth/callback',
  },
};
