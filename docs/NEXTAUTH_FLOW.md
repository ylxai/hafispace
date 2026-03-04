# NextAuth.js Authentication Flow - Hafiportrait Platform

## Penting: NextAuth.js Behavior

NextAuth.js **TIDAK mengembalikan JSON response** untuk authentication endpoints. Semua endpoint mengembalikan **HTTP 302 redirects**.

Client-side function `signIn()` dari `next-auth/react` yang mem-parse redirect dan mengembalikan object response.

---

## Auto-Generated Endpoints

NextAuth.js otomatis membuat endpoints berikut via `[...nextauth]/route.ts`:

### 1. GET /api/auth/providers
Mengembalikan list authentication providers yang tersedia.

**Response:**
```json
{
  "credentials": {
    "id": "credentials",
    "name": "Credentials",
    "type": "credentials",
    "signinUrl": "http://localhost:3000/api/auth/signin/credentials",
    "callbackUrl": "http://localhost:3000/api/auth/callback/credentials"
  }
}
```

### 2. GET /api/auth/csrf
Mengembalikan CSRF token untuk form submission.

**Response:**
```json
{
  "csrfToken": "..."
}
```

### 3. GET /api/auth/session
Mengembalikan current session atau null.

**Response (authenticated):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Studio Name",
    "email": "email@example.com"
  },
  "expires": "2026-04-04T00:00:00.000Z"
}
```

**Response (not authenticated):**
```json
null
```

### 4. POST /api/auth/signin/credentials
Entry point untuk credentials login (biasanya dari form HTML).

**Returns:** 302 redirect ke `/api/auth/callback/credentials`

### 5. POST /api/auth/callback/credentials
Actual authentication endpoint yang memproses credentials.

**Request (application/x-www-form-urlencoded):**
```
username=nandika
password=klp123
csrfToken=...
callbackUrl=http://localhost:3000
```

**Response:**
- **Success:** 302 redirect ke `callbackUrl` dengan session cookie
- **Failure:** 302 redirect ke `/api/auth/signin?error=CredentialsSignin`

**Cookies set:**
- `next-auth.session-token` (HttpOnly, SameSite=Lax)
- `next-auth.csrf-token` (HttpOnly, SameSite=Lax)
- `next-auth.callback-url` (HttpOnly, SameSite=Lax)

### 6. POST /api/auth/signout
Sign out current user.

**Request:**
```json
{
  "csrfToken": "..."
}
```

**Response:** 302 redirect ke `/` dengan cookies cleared

---

## Client-Side Usage (Recommended)

### Login
```typescript
import { signIn } from "next-auth/react";

const result = await signIn("credentials", {
  username: "nandika",
  password: "klp123",
  redirect: false, // Prevent automatic redirect
});

// Result object:
// {
//   error: string | undefined,  // "CredentialsSignin" if failed
//   status: number,              // 200
//   ok: boolean,                 // true if success, false if failed
//   url: string | null           // redirect URL
// }

if (result?.error) {
  console.error("Login failed:", result.error);
} else {
  router.push("/admin");
}
```

### Check Session
```typescript
import { useSession } from "next-auth/react";

const { data: session, status } = useSession();

// status: "loading" | "authenticated" | "unauthenticated"
// session: { user: {...}, expires: "..." } | null
```

### Logout
```typescript
import { signOut } from "next-auth/react";

await signOut({ 
  redirect: true,
  callbackUrl: "/login" 
});
```

---

## Server-Side Usage

### Check Authentication
```typescript
import { auth } from "@/lib/auth/options";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return unauthorizedResponse(); // 401
  }
  
  // User is authenticated
  const userId = session.user.id;
  // ...
}
```

---

## Authentication Flow

### Successful Login
```
1. User submits form → signIn("credentials", {...})
2. Client calls → POST /api/auth/signin/credentials
3. NextAuth redirects → POST /api/auth/callback/credentials
4. authorize() function validates credentials
5. If valid: return user object
6. NextAuth creates JWT token
7. jwt() callback adds user.id to token
8. session() callback adds token.id to session
9. NextAuth sets session cookie
10. Redirects to callbackUrl
11. signIn() resolves with {ok: true, error: undefined}
```

### Failed Login
```
1. User submits form → signIn("credentials", {...})
2. Client calls → POST /api/auth/signin/credentials
3. NextAuth redirects → POST /api/auth/callback/credentials
4. authorize() function validates credentials
5. If invalid: return null
6. NextAuth redirects to /api/auth/signin?error=CredentialsSignin
7. signIn() resolves with {ok: false, error: "CredentialsSignin"}
```

---

## Testing Authentication

### ❌ WRONG: Direct HTTP call expecting JSON
```bash
# This will NOT work as expected
curl -X POST /api/auth/callback/credentials \
  -d '{"username":"nandika","password":"klp123"}' \
  -H "Content-Type: application/json"
# Returns: 302 redirect (not JSON)
```

### ✅ CORRECT: Test via client-side function
```typescript
// In test file
import { signIn } from "next-auth/react";

const result = await signIn("credentials", {
  username: "nandika",
  password: "wrongpassword",
  redirect: false,
});

expect(result?.ok).toBe(false);
expect(result?.error).toBe("CredentialsSignin");
```

### ✅ CORRECT: Test HTTP redirect behavior
```bash
# Test that callback returns 302
curl -i -X POST /api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=nandika&password=klp123&csrfToken=..."

# Expected: HTTP/1.1 302 Found
# Location: http://localhost:3000/...
# Set-Cookie: next-auth.session-token=...
```

---

## Security Notes

1. **CSRF Protection:** NextAuth.js automatically handles CSRF tokens
2. **HttpOnly Cookies:** Session tokens stored in HttpOnly cookies (not accessible via JavaScript)
3. **SameSite:** Cookies use SameSite=Lax to prevent CSRF attacks
4. **JWT Strategy:** Session data stored in encrypted JWT (not in database)
5. **Password Hashing:** Uses bcrypt with cost factor 12 (see `src/lib/auth/password.ts`)

---

## Credential Validation Logic

Located in `src/lib/auth/options.ts`:

```typescript
async authorize(credentials) {
  // 1. Check if username and password provided
  if (!credentials?.username || !credentials?.password) {
    return null; // → Login fails
  }

  // 2. Find user in database
  const user = await prisma.vendor.findUnique({
    where: { username: credentials.username }
  });

  if (!user) {
    return null; // → Login fails (user not found)
  }

  // 3. Verify password with bcrypt
  const isValid = await verifyPassword(
    credentials.password,
    user.password
  );

  if (!isValid) {
    return null; // → Login fails (wrong password)
  }

  // 4. Return user object → Login succeeds
  return {
    id: user.id,
    name: user.namaStudio ?? user.username,
    email: user.email,
  };
}
```

**Important:** Returning `null` from `authorize()` triggers login failure, NOT an HTTP error status.

---

## Common Mistakes

### ❌ Expecting HTTP 401 for invalid credentials
NextAuth.js **always returns 302 redirect**, never 401.

### ❌ Expecting JSON response from /api/auth/callback/*
These endpoints return **HTTP redirects**, not JSON.

### ❌ Testing authentication without CSRF token
Most POST requests to NextAuth endpoints require valid CSRF token.

### ✅ Use client-side signIn() for testing
The `signIn()` function handles all the complexity and returns a clean result object.

---

## Environment Variables

Required in `.env.local`:

```env
# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Database (for user lookup)
DATABASE_URL="postgresql://..."
```

---

## References

- NextAuth.js Docs: https://next-auth.js.org/
- Credentials Provider: https://next-auth.js.org/providers/credentials
- Callbacks: https://next-auth.js.org/configuration/callbacks
