"use client";

import { useRouter } from "next/navigation";
import { VoiceProfileCreateForm } from "@/components/voice/VoiceProfileCreateForm";

type Props = {
  mode: "create";
  prefill?: {
    displayName?: string;
    city?: string;
    birthYear?: number;
  };
};

/**
 * Client shell for the record page when no voice profile exists.
 * Shows the creation form and refreshes the page after creation
 * so the server component re-renders with the training flow.
 */
export function RecordPageShell({ prefill }: Props) {
  const router = useRouter();

  return (
    <VoiceProfileCreateForm
      prefill={prefill}
      onCreated={() => {
        // Server component will now find the new voice profile and show training flow
        router.refresh();
      }}
    />
  );
}
