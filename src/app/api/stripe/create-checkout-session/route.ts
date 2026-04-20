import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// PLACEHOLDER_7b: real Stripe Checkout Session creation lives here. For 7a,
// the route returns a mock URL that points at the sealed screen so the
// callback shape (`{ checkoutUrl: string }`) is stable and the screens can
// swap out of local-only routing without further changes in 7b.
export async function POST(req: NextRequest) {
  const { plan } = await req.json();
  return NextResponse.json({
    checkoutUrl: `/app/vault/sealed?mock=true&plan=${plan}`,
  });
}
