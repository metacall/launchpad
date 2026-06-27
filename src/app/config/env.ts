interface Env {
  FAAS_URL: string;
  FAAS_TOKEN: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
}

export const env: Env = {
  FAAS_URL: ((import.meta.env['VITE_FAAS_URL'] as string | undefined) ??
            (typeof window !== 'undefined' && window.location.origin.includes('dashboard.metacall.io')
              ? 'https://api.metacall.io'
              : 'http://localhost:9000')).replace('dashboard.metacall.io', 'api.metacall.io'),
  FAAS_TOKEN: (import.meta.env['VITE_FAAS_TOKEN'] as string | undefined) ?? 'local',
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
};
