-- Ensure training_clip_status has values needed for init->upload->commit pipeline.
-- Safe to run: ADD VALUE IF NOT EXISTS only adds when missing.

alter type public.training_clip_status add value if not exists 'uploading';
alter type public.training_clip_status add value if not exists 'uploaded';
