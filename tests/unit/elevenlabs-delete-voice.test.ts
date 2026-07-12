import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 'server-only' (imported by the module under test) is aliased to an empty stub
// in vitest.config.ts, so the ElevenLabs lib can be imported directly here.
import { deleteVoice } from '@/lib/elevenlabs';

const DELETE_URL = 'https://api.elevenlabs.io/v1/voices/voice_abc123';

function fetchOnce(res: Partial<Response> & { status: number; ok: boolean; json?: () => Promise<unknown> }) {
  const mock = vi.fn().mockResolvedValue(res);
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('deleteVoice', () => {
  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = 'sk_test_key';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('DELETEs the voice with the api key and resolves ok on 200', async () => {
    const mock = fetchOnce({ ok: true, status: 200, json: async () => ({}) });
    const result = await deleteVoice('voice_abc123');

    expect(result).toEqual({ ok: true });
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe(DELETE_URL);
    expect(init.method).toBe('DELETE');
    expect(init.headers['xi-api-key']).toBe('sk_test_key');
  });

  it('treats a 404 (already gone) as idempotent success', async () => {
    fetchOnce({ ok: false, status: 404, json: async () => ({ detail: { message: 'voice not found' } }) });
    const result = await deleteVoice('voice_abc123');
    expect(result).toEqual({ ok: true });
  });

  it('surfaces a non-404 error with status and message', async () => {
    fetchOnce({ ok: false, status: 500, json: async () => ({ detail: { message: 'server exploded', code: 'boom' } }) });
    const result = await deleteVoice('voice_abc123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.message).toBe('server exploded');
      expect(result.code).toBe('boom');
    }
  });

  it('rejects an empty voice id without calling the network', async () => {
    const mock = fetchOnce({ ok: true, status: 200, json: async () => ({}) });
    const result = await deleteVoice('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mock).not.toHaveBeenCalled();
  });

  it('maps an aborted request to a 504 timeout', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    const result = await deleteVoice('voice_abc123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(504);
  });
});
