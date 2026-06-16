-- Phase 8b: Add duration_ms to usage_events for latency tracking
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS duration_ms int;
