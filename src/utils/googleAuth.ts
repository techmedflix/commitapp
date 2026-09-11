// Google Identity Services (GIS) Helper

export const ALLOWED_GOOGLE_DOMAIN = 'medflix.app';

export function isAllowedGoogleEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain === ALLOWED_GOOGLE_DOMAIN;
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  givenName?: string;
  picture?: string;
  sub: string;
}

// Global window declare for Google GIS script
declare global {
  interface Window {
    google?: any;
    onGoogleLibraryLoad?: () => void;
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export const loadGoogleGsiScript = (): Promise<boolean> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

// Decode Google JWT ID Token payload without external heavy dependencies
export const parseGoogleJwt = (token: string): GoogleUserProfile | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.email || '',
      name: parsed.name || parsed.given_name || 'Google User',
      givenName: parsed.given_name,
      picture: parsed.picture,
      sub: parsed.sub,
    };
  } catch (err) {
    console.error('Failed to parse Google JWT Credential:', err);
    return null;
  }
};

// Default public Google OAuth Client ID for local dev / testing fallback
export const DEFAULT_GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1051515222047-97smcghdkl17m60i00g5pl4q6j21n403.apps.googleusercontent.com';
