# Security

## Service role key policy
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- It is only used in server code (route handlers in `src/app/api/**` and server utilities).
- Any file that can access it must include `import "server-only";` at the top.
- Client components must never import server utilities.

## Public keys
- Browser code may only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
