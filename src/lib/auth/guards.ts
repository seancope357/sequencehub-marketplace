import { getCurrentUser } from '@/lib/supabase/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import type { AuthUser } from '@/lib/auth-types';
import { forbiddenError, unauthorizedError } from '@/lib/api/errors';

export async function requireAuthenticatedUser(): Promise<
  | { user: AuthUser; response?: never }
  | { user?: never; response: ReturnType<typeof unauthorizedError> }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: unauthorizedError() };
  }

  return { user };
}

export async function requireCreatorOrAdminUser(): Promise<
  | { user: AuthUser; response?: never }
  | { user?: never; response: ReturnType<typeof unauthorizedError> | ReturnType<typeof forbiddenError> }
> {
  const authResult = await requireAuthenticatedUser();
  if (authResult.response) {
    return authResult;
  }

  if (!isCreatorOrAdmin(authResult.user)) {
    return {
      response: forbiddenError('Creator role required'),
    };
  }

  return { user: authResult.user };
}
