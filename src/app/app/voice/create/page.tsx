import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Spine-wiring S2b: voice creation moved to /app/voice/processing, which runs it
// only AFTER payment (MASTER_SPEC §4.4). This route no longer triggers creation —
// it forwards to Card Capture, where the user commits before processing. The old
// VoiceCreationView is now unused and is deleted in S4. The URL is kept as a
// stable forward (DECISIONS lock: URLs don't change during a redesign).
export default function VoiceCreatePage() {
  redirect(ROUTES.vaultProtect);
}
