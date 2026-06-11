'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { MessageCreationFlow } from '@/components/screens/messages/MessageCreationFlow';
import { clearFlowId } from '@/lib/analytics/step6';
import type { ExistingRecipient } from '@/components/screens/messages/RecipientSetupScreen.types';
import { ROUTES } from '@/lib/routes';

/**
 * Client wrapper for /messages/new. Provides router-driven exit and
 * clears the active flow_id when the user backs out of the flow.
 */

interface MessagesNewPageClientProps {
  existingRecipients: ExistingRecipient[];
}

export function MessagesNewPageClient({
  existingRecipients,
}: MessagesNewPageClientProps) {
  const router = useRouter();

  const handleExit = useCallback(() => {
    clearFlowId();
    router.push(ROUTES.home);
  }, [router]);

  return (
    <MessageCreationFlow
      existingRecipients={existingRecipients}
      onExitFlow={handleExit}
    />
  );
}
