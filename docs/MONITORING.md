# ESSENCE Monitoring & Debugging Guide

## Where to look

### Vercel Logs (Runtime)

All structured logs are JSON lines. Search by:

- `request_id` — correlate all events within a single request
- `event` — filter by event type
- `outcome: "error"` — find failures
- `outcome: "rejected"` — find rate limit / guard rejections

Key events to watch:
- `message_generate_start` / `message_generate_complete` — message lifecycle
- `message_tts_failed` / `message_upload_failed` — failure points
- `voice_create_start` / `voice_create_complete` — voice creation lifecycle
- `voice_create_elevenlabs_failed` — ElevenLabs errors
- `delete_my_data_invoked` — data deletion (should be rare)

### Supabase Dashboard

**Database → SQL Editor:**

```sql
-- Messages stuck in "generating" (should be rare; means request crashed mid-flight)
SELECT id, user_id, status, created_at, generation_started_at
FROM messages
WHERE status = 'generating'
  AND generation_started_at < now() - interval '10 minutes';

-- Messages stuck in "saving" (storage upload may have failed silently)
SELECT id, user_id, status, created_at
FROM messages
WHERE status = 'saving'
  AND updated_at < now() - interval '10 minutes';

-- Voice profiles stuck in "processing"
SELECT id, user_id, status, last_attempt_at
FROM voice_profiles
WHERE status = 'processing'
  AND last_attempt_at < now() - interval '5 minutes';

-- Recent failures
SELECT id, status, last_error_code, last_error_message, created_at
FROM messages
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Usage event summary (last 24h)
SELECT action, outcome, count(*)
FROM usage_events
WHERE created_at > now() - interval '24 hours'
GROUP BY action, outcome
ORDER BY action, outcome;

-- Top users by generation count (last 24h)
SELECT user_id, count(*) as gen_count
FROM usage_events
WHERE action = 'message_generate'
  AND created_at > now() - interval '24 hours'
GROUP BY user_id
ORDER BY gen_count DESC
LIMIT 10;

-- Check for duplicate generations (idempotency key collisions)
SELECT idempotency_key, count(*)
FROM messages
WHERE idempotency_key IS NOT NULL
  AND status != 'failed'
GROUP BY idempotency_key
HAVING count(*) > 1;
```

-- Orphan detection: messages marked saved but missing storage_path
SELECT id, user_id, status, storage_path
FROM messages
WHERE status = 'saved'
  AND (storage_path IS NULL OR storage_path = '');

-- Orphan cross-check: list saved paths to verify against Storage browser
SELECT id, storage_bucket, storage_path
FROM messages
WHERE status = 'saved'
  AND storage_path IS NOT NULL;

-- Unexpected state transitions: saved without generation started
SELECT id, status, generation_started_at, generation_completed_at
FROM messages
WHERE generation_completed_at IS NOT NULL
  AND generation_started_at IS NULL;

-- Saved without completion timestamp (skipped a step)
SELECT id, status, generation_started_at, generation_completed_at
FROM messages
WHERE status = 'saved'
  AND generation_completed_at IS NULL;
```

### Latency Percentiles

```sql
-- Message generation latency (p50 / p90) — last 24h
SELECT
  count(*) AS total,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_ms) AS p90_ms,
  max(duration_ms) AS max_ms
FROM usage_events
WHERE action = 'message_generate'
  AND outcome = 'success'
  AND duration_ms IS NOT NULL
  AND created_at > now() - interval '24 hours';

-- Voice creation latency (p50 / p90) — last 24h
SELECT
  count(*) AS total,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_ms) AS p90_ms,
  max(duration_ms) AS max_ms
FROM usage_events
WHERE action = 'voice_create'
  AND outcome = 'success'
  AND duration_ms IS NOT NULL
  AND created_at > now() - interval '24 hours';
```

### Cost Risk Early Warning

```sql
-- Generations in the last hour (soft threshold: investigate if > 200)
SELECT count(*) AS generations_last_hour
FROM usage_events
WHERE action = 'message_generate'
  AND created_at > now() - interval '1 hour';

-- Voice creations in the last hour (soft threshold: investigate if > 50)
SELECT count(*) AS voice_creates_last_hour
FROM usage_events
WHERE action = 'voice_create'
  AND created_at > now() - interval '1 hour';
```

### Rate Limit Rejection Visibility

```sql
-- Rate limit rejections in the last hour (by action)
SELECT action, count(*) AS rejections
FROM usage_events
WHERE outcome = 'rejected'
  AND created_at > now() - interval '1 hour'
GROUP BY action
ORDER BY rejections DESC;
```

### User Experience Health

```sql
-- Failure rate in the last hour (investigate if > 5% of total generations)
SELECT
  count(*) FILTER (WHERE outcome = 'error') AS failures,
  count(*) FILTER (WHERE outcome = 'success') AS successes,
  count(*) AS total,
  round(
    100.0 * count(*) FILTER (WHERE outcome = 'error') / NULLIF(count(*), 0),
    1
  ) AS failure_pct
FROM usage_events
WHERE action = 'message_generate'
  AND created_at > now() - interval '1 hour';
```

**Storage → essence-audio bucket:**
- Browse `users/{userId}/` to verify audio files exist
- Check file sizes — zero-byte files indicate upload failures

## Rate Limit Caps

| Cap | Default | Env Override |
|-----|---------|-------------|
| Clips per voice profile | 30 | `RATE_LIMIT_MAX_CLIPS_PER_PROFILE` |
| Messages per day | 20 | `RATE_LIMIT_MAX_MESSAGES_PER_DAY` |
| Voice creations per day | 5 | `RATE_LIMIT_MAX_VOICE_CREATIONS_PER_DAY` |
| Signed URLs per minute | 30 | `RATE_LIMIT_MAX_SIGNED_URLS_PER_MINUTE` |

## Error Codes

| Code | Retryable | Meaning |
|------|-----------|---------|
| `RATE_LIMIT_EXCEEDED` | Yes (after cooldown) | Short-term rate limit |
| `DAILY_LIMIT_REACHED` | No (until tomorrow) | Daily cap hit |
| `CLIP_LIMIT_REACHED` | No | Max clips per profile |
| `VALIDATION_ERROR` | No | Bad input |
| `VOICE_NOT_READY` | No | Profile not in ready state |
| `TTS_FAILED` | Yes (user retry) | ElevenLabs returned error |
| `TTS_TIMEOUT` | Yes (user retry) | ElevenLabs timed out (60s) |
| `STORAGE_FAILED` | Yes (user retry) | Supabase Storage upload failed |
| `BODY_TOO_LARGE` | No | Request body > 50KB |

## Delete My Data (internal testing)

```bash
curl -X DELETE http://localhost:3000/api/me \
  -H "Cookie: <your-auth-cookie>" \
  -H "x-confirm-delete: DELETE_MY_DATA"
```

Requires: `ENABLE_INTERNAL_DELETE=true` in env + `NODE_ENV !== 'production'`.
