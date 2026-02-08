import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, getApiErrorMessage, RequestTimeoutError } from './fetch-with-timeout';

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns response when request completes before timeout', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const result = await fetchWithTimeout('/api/example', {}, 1000);

    expect(result.status).toBe(200);
  });

  it('throws RequestTimeoutError when request aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    );

    await expect(fetchWithTimeout('/api/example', {}, 200)).rejects.toBeInstanceOf(
      RequestTimeoutError
    );
  });
});

describe('getApiErrorMessage', () => {
  it('reads string error payloads', async () => {
    const response = new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });
    const message = await getApiErrorMessage(response, 'Fallback');
    expect(message).toBe('Bad request');
  });

  it('reads envelope error payloads', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Invalid input' } }),
      { status: 400 }
    );
    const message = await getApiErrorMessage(response, 'Fallback');
    expect(message).toBe('Invalid input');
  });

  it('uses fallback when payload is not valid JSON', async () => {
    const response = new Response('not-json', { status: 500 });
    const message = await getApiErrorMessage(response, 'Fallback');
    expect(message).toBe('Fallback');
  });
});

