const KEY_STORAGE = 'kiteurl_api_key';

export const AUTH_EVENT = 'kiteurl:auth-required';

export function getApiKey(): string {
  return sessionStorage.getItem(KEY_STORAGE) || '';
}

export function setApiKey(key: string): void {
  sessionStorage.setItem(KEY_STORAGE, key);
}

/** fetch() for the protected admin API. Adds the API key and asks for it again on a 401. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const key = getApiKey();
  if (key) headers.set('Authorization', `Bearer ${key}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) window.dispatchEvent(new Event(AUTH_EVENT));
  return res;
}
