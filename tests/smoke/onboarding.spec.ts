/**
 * Smoke: full onboarding wizard.
 *
 * Walks a fresh user through all 12 screens (no shortcuts) and verifies
 * the completion server action wrote every column the wizard collects,
 * then that the post-complete navigation lands on /app/record.
 *
 * Why no localStorage shortcuts: the avatar spec already covers Screen 10
 * in isolation. This test exists to catch wizard-level regressions —
 * each Continue handler, the Screen 6→7 phase transition, the form
 * validation gate on Screen 8, the 3500ms priming lock on Screen 11,
 * and the final completeOnboarding server action.
 *
 * Total runtime ~25s, dominated by Screen 2's 14.3s cinematic conveyor
 * and Screen 11's 3.5s unlock. Both are intentional product timings.
 */
import { test, expect } from './fixtures/auth';
import { adminClient } from './fixtures/supabase';

test.describe('onboarding wizard', () => {
  test('walks all 12 screens and persists profile data', async ({
    authedContext,
    testUser,
  }) => {
    const page = await authedContext.newPage();
    await page.goto('/onboarding');

    // Screen 1 — Welcome
    await expect(page.getByRole('heading', { name: /your voice is yours alone/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();

    // Screen 2 — Purpose / cinematic conveyor.
    // The CTA fades in at ~14.3s after the conveyor lands. Wait for the
    // visible button rather than racing the timer.
    await expect(page.getByRole('heading', { name: /here's what essence does/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click({ timeout: 20_000 });

    // Screen 3 — Who this is for
    await expect(page.getByRole('heading', { name: /this is for people who plan ahead/i })).toBeVisible();
    await page.getByRole('button', { name: /that sounds like me/i }).click();

    // Screen 4 — Safety & trust
    await expect(page.getByRole('heading', { name: /your voice stays private/i })).toBeVisible();
    await page.getByRole('button', { name: /i understand/i }).click();

    // Screen 5 — Why your voice matters
    await expect(page.getByRole('heading', { name: /no one else sounds like you/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();

    // Screen 6 — How this works
    await expect(page.getByRole('heading', { name: /here's how this works/i })).toBeVisible();
    await page.getByRole('button', { name: /let'?s begin/i }).click();

    // Screen 7 — Identity setup intro (PHASE TRANSITION)
    await expect(page.getByRole('heading', { name: /first, tell us a little about you/i })).toBeVisible();
    await page.getByRole('button', { name: /get started/i }).click();

    // Screen 8 — About you (form)
    // Submit-button gating: Continue is disabled until every field is valid.
    await expect(page.getByRole('heading', { name: /tell us about you/i })).toBeVisible();
    const continueBtn = page.getByRole('button', { name: /^continue$/i });
    await expect(continueBtn).toBeDisabled();

    await page.getByLabel(/first name/i).fill('Sarah');
    await page.getByLabel(/last name/i).fill('McConnell');
    await page.getByLabel(/date of birth/i).fill('1968-03-14');
    await page.getByLabel(/^city$/i).fill('asheville'); // intentionally lower — exercises smartCase
    await page.getByLabel(/^state$/i).selectOption('NC');

    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Screen 9 — Review
    await expect(page.getByRole('heading', { name: /does this look right/i })).toBeVisible();
    // Form values are echoed back in the review card (avatar omitted —
    // covered by the dedicated avatar smoke spec).
    await expect(page.getByText(/sarah mcconnell/i)).toBeVisible();
    await expect(page.getByText(/3\/14\/1968/)).toBeVisible();
    await expect(page.getByText(/asheville, nc/i)).toBeVisible();
    await page.getByRole('button', { name: /looks good/i }).click();

    // Screen 10 — Photo (skip — covered separately)
    await expect(page.getByRole('heading', { name: /add a photo if you'?d like/i })).toBeVisible();
    await page.getByRole('button', { name: /continue without photo/i }).click();

    // Screen 11 — Priming (3500ms unlock).
    // The button is rendered immediately but pointer-events:none + opacity 0.4
    // until the timer fires. Wait for the unlocked class on the CTA wrapper.
    await expect(page.getByRole('heading', { name: /take a breath/i })).toBeVisible();
    await expect(page.locator('.onboarding-ctas--unlocked')).toBeVisible({ timeout: 6_000 });
    await page.getByRole('button', { name: /begin setup/i }).click();

    // Screen 12 — Ready to begin → fires completeOnboarding + router.push.
    await expect(page.getByRole('heading', { name: /ready to begin recording/i })).toBeVisible();
    await page.getByRole('button', { name: /begin recording/i }).click();

    // Post-complete navigation. The OnboardingPageClient calls
    // router.push('/app/record') after the server action resolves.
    await page.waitForURL(/\/app\/record/, { timeout: 15_000 });

    // ─── Backend assertions ──────────────────────────────────────────
    const admin = adminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select(
        'first_name, last_name, display_name, date_of_birth, birth_year, city, state, onboarding_completed_at'
      )
      .eq('user_id', testUser.id)
      .single();

    expect(error).toBeNull();
    expect(profile?.first_name).toBe('Sarah');
    expect(profile?.last_name).toBe('McConnell');
    // smartCase normalizes the lowercase "asheville" we typed.
    expect(profile?.city).toBe('Asheville');
    expect(profile?.state).toBe('NC');
    expect(profile?.date_of_birth).toBe('1968-03-14');
    expect(profile?.birth_year).toBe(1968);
    // display_name is the canonical "First Last" so legacy queries keep working.
    expect(profile?.display_name).toBe('Sarah McConnell');
    expect(profile?.onboarding_completed_at).toBeTruthy();
  });

  test('redirects already-completed users to /home', async ({
    authedContext,
    testUser,
  }) => {
    // Mark onboarding done out-of-band so we don't have to walk the wizard
    // again — this test is about the redirect, not completion.
    const admin = adminClient();
    await admin
      .from('profiles')
      .upsert(
        {
          user_id: testUser.id,
          first_name: 'Already',
          last_name: 'Done',
          display_name: 'Already Done',
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    const page = await authedContext.newPage();
    await page.goto('/onboarding');

    // page.tsx redirects to /home before the wizard ever renders.
    await page.waitForURL(/\/home/, { timeout: 10_000 });
  });
});
