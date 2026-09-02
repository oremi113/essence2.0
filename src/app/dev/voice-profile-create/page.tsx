'use client';

import { VoiceProfileCreateForm } from '@/components/voice/VoiceProfileCreateForm';

/**
 * /dev/voice-profile-create — isolated harness for the voice-profile create
 * form (which carries the voice-cloning consent gate). Unauthenticated, so the
 * consent copy + the both-boxes-required CTA can be reviewed without the
 * /app/record flow. Submitting here would 401; the harness is for the form UI.
 */
export default function DevVoiceProfileCreatePage() {
  return (
    <div style={{ padding: 24 }}>
      <VoiceProfileCreateForm onCreated={(id) => console.log('created', id)} />
    </div>
  );
}
