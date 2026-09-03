import { HomeAScreen } from '@/components/screens/home/HomeAScreen';

/**
 * /dev/home-a — isolated harness for the interim pre-voice-ready home.
 * Renders both states stacked (recording-in-progress and processing) so the
 * stopgap can be reviewed without a live voice profile. Permanent per CLAUDE.md.
 */
export default function DevHomeAPage() {
  return (
    <div>
      <HomeAScreen isProcessing={false} footer={<a href="#">Sign out</a>} />
      <HomeAScreen isProcessing footer={<a href="#">Sign out</a>} />
    </div>
  );
}
