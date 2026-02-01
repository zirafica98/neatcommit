export const environment = {
  production: true,
  apiUrl: process.env['API_URL'] || 'https://api.elementer.com',
  frontendUrl: process.env['FRONTEND_URL'] || 'https://elementer.com',
  github: {
    clientId: process.env['GITHUB_CLIENT_ID'] || '',
    redirectUri: process.env['FRONTEND_URL'] + '/auth/callback' || 'https://elementer.com/auth/callback',
  },
};
