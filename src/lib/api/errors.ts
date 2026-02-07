import { NextResponse } from 'next/server';

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiError(
  message: string,
  status: number,
  code: string,
  details?: unknown
): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export function unauthorizedError(message = 'Unauthorized'): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 401, 'UNAUTHORIZED');
}

export function forbiddenError(message = 'Forbidden'): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 403, 'FORBIDDEN');
}

export function badRequestError(
  message = 'Invalid request',
  details?: unknown
): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 400, 'BAD_REQUEST', details);
}

export function notFoundError(message = 'Not found'): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 404, 'NOT_FOUND');
}

export function conflictError(message: string, details?: unknown): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 409, 'CONFLICT', details);
}

export function internalServerError(
  message = 'Internal server error',
  details?: unknown
): NextResponse<ApiErrorEnvelope> {
  return apiError(message, 500, 'INTERNAL_SERVER_ERROR', details);
}
