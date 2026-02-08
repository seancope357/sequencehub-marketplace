export class RequestTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string' && payload.error.length > 0) {
      return payload.error;
    }
    if (
      payload?.error &&
      typeof payload.error === 'object' &&
      typeof payload.error.message === 'string' &&
      payload.error.message.length > 0
    ) {
      return payload.error.message;
    }
  } catch {
    // Ignore invalid JSON payloads and use fallback below.
  }

  return fallback;
}

