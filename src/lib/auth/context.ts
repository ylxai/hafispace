import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Authenticated user context.
 * If this type exists in your handler, auth is guaranteed.
 */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Get authenticated user from request.
 * Middleware already verified token, we just decode it.
 * 
 * @returns AuthUser if authenticated, null otherwise
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = await getToken({ req: request });
  
  if (!token?.id) return null;
  
  return {
    id: token.id as string,
    name: token.name ?? null,
    email: token.email ?? null,
  };
}

/**
 * Require authentication. Throws if not authenticated.
 * Use this at the start of protected routes.
 * 
 * @throws AuthError if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  
  if (!user) {
    throw new AuthError("Authentication required", "UNAUTHORIZED");
  }
  
  return user;
}

/**
 * Auth error for consistent error handling.
 * Extends Error with code and status for API responses.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = "AUTH_ERROR",
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}
