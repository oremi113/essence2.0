/**
 * Smoke: profile photo upload.
 *
 * End-to-end check of the Screen 10 photo flow:
 *   1. Pre-seed localStorage so we land directly on screen 10 (skips
 *      walking the 9 prior screens — they're not what we're testing).
 *   2. setInputFiles a tiny PNG into the hidden file input.
 *   3. Wait for the server action's "Looking good ✓" confirmation.
 *   4. Verify the storage object exists in `profile-photos`.
 *   5. Verify `profiles.avatar_storage_*` columns were written.
 *   6. Verify a fresh signed URL resolves to a 200.
 *
 * Cleanup: the storage object is removed explicitly in afterEach because
 * deleteTestUser only removes auth + cascades the profile row — storage
 * objects don't auto-delete on user removal.
 */
import { test, expect } from './fixtures/auth';
import { adminClient } from './fixtures/supabase';

const AVATAR_BUCKET = 'profile-photos';

// 67-byte transparent 1×1 PNG. Smallest valid PNG that satisfies the
// server's mime check (image/png) without needing a fixture file on disk.
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// localStorage shape mirrors OnboardingDraft in OnboardingScreen.tsx —
// keep this in sync if the draft schema or storage key changes.
const DRAFT_STORAGE_KEY = 'essence-onboarding-draft-v1';

test.describe('onboarding photo upload', () => {
  test('uploads a photo and persists it to storage + profile', async ({
    authedContext,
    testUser,
  }) => {
    const page = await authedContext.newPage();

    // Seed the wizard draft so it boots on screen 10. We fill the form
    // fields with valid placeholder data (required for screens 8/9 to
    // pass validation if the user navigates back during the test).
    await page.addInitScript(
      ({ key, draft }) => {
        window.localStorage.setItem(key, JSON.stringify(draft));
      },
      {
        key: DRAFT_STORAGE_KEY,
        draft: {
          currentScreen: 10,
          form: {
            firstName: 'Smoke',
            lastName: 'Test',
            dob: '1990-01-15',
            city: 'Asheville',
            stateCode: 'NC',
            avatarUrl: null,
          },
        },
      }
    );

    await page.goto('/onboarding');

    // Photo button is the visible affordance; the file input is hidden
    // sibling. Clicking the button opens the OS file picker — bypass that
    // by setting the file directly on the input.
    const photoButton = page.locator('.onboarding-photo');
    await expect(photoButton).toBeVisible();

    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });

    // Confirmation copy + visible state class both flip after the server
    // action resolves. The visible class is the pure-CSS reveal toggle;
    // wait on it rather than racing the text contents.
    await expect(page.locator('.onboarding-photo-confirmation--visible')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.onboarding-photo--filled')).toBeVisible();
    await expect(page.locator('.onboarding-photo-error')).toHaveCount(0);

    // ─── Backend assertions ─────────────────────────────────────────
    const admin = adminClient();

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('avatar_storage_bucket, avatar_storage_path')
      .eq('user_id', testUser.id)
      .single();
    expect(profileErr).toBeNull();
    expect(profile?.avatar_storage_bucket).toBe(AVATAR_BUCKET);
    expect(profile?.avatar_storage_path).toBe(`users/${testUser.id}/avatar.png`);

    // Storage object exists at the recorded path.
    const { data: list, error: listErr } = await admin.storage
      .from(AVATAR_BUCKET)
      .list(`users/${testUser.id}`);
    expect(listErr).toBeNull();
    expect(list?.some((f) => f.name === 'avatar.png')).toBe(true);

    // Fresh signed URL resolves and serves the bytes we uploaded.
    const { data: signed, error: signedErr } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(`users/${testUser.id}/avatar.png`, 60);
    expect(signedErr).toBeNull();
    expect(signed?.signedUrl).toBeTruthy();

    const fetched = await page.request.get(signed!.signedUrl);
    expect(fetched.status()).toBe(200);
    const bytes = await fetched.body();
    expect(bytes.length).toBe(TINY_PNG.length);

    // ─── Teardown: storage doesn't cascade on user delete ───────────
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove([`users/${testUser.id}/avatar.png`]);
  });

  test('rejects unsupported mime types', async ({ authedContext }) => {
    const page = await authedContext.newPage();

    await page.addInitScript(
      ({ key, draft }) => {
        window.localStorage.setItem(key, JSON.stringify(draft));
      },
      {
        key: DRAFT_STORAGE_KEY,
        draft: {
          currentScreen: 10,
          form: {
            firstName: 'Smoke',
            lastName: 'Test',
            dob: '1990-01-15',
            city: 'Asheville',
            stateCode: 'NC',
            avatarUrl: null,
          },
        },
      }
    );

    await page.goto('/onboarding');
    await expect(page.locator('.onboarding-photo')).toBeVisible();

    // Submit a fake "GIF" (the file input has accept="image/jpeg,png,webp"
    // so the OS picker would filter this — but Playwright bypasses that
    // and the server-side allowlist must reject).
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await fileInput.setInputFiles({
      name: 'avatar.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });

    // Error message surfaces; photo stays unfilled.
    await expect(page.locator('.onboarding-photo-error')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('.onboarding-photo--filled')).toHaveCount(0);
  });
});
