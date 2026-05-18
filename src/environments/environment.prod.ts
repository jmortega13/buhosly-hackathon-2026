// Production environment, used by `ng build` (the production config).
// Update apiBaseUrl to point at your Render web service once it's deployed,
// e.g. https://buhosly-api.onrender.com/api/v1
//
// Update googleClientId too if you use a different OAuth client for prod
// (typically not necessary — the same client works as long as the Vercel
// origin is added to Authorized JavaScript origins in Google Cloud Console).

export const environment = {
  production: true,
  apiBaseUrl: 'https://buhosly-hackathon-2026.onrender.com/api/v1',
  googleClientId: '546028716669-unl8fthrdkkqa2it8dcil3fvvqrcic8f.apps.googleusercontent.com',
};
