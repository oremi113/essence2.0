import { ALL_PROMPTS, TOTAL_PROMPT_COUNT, getStageStartIndex } from '@/lib/voice-training/script';
import type { RecordScreenData } from './RecordScreen.types';

export type RecordView =
  | { type: 'entry' }
  | { type: 'grounding' }
  | { type: 'mic-permission' }
  | { type: 'checklist' }
  | { type: 'environment' }
  | { type: 'stage-intro'; stage: 1 | 2 | 3 }
  | { type: 'prompt'; promptIndex: number }
  | { type: 'celebration'; afterPromptIndex: number }
  | { type: 'paused' }
  | { type: 'working' }
  | { type: 'ready' };

export type RecordAction =
  | { type: 'ENTRY_CONTINUED' }
  | { type: 'GROUNDING_CONTINUED' }
  | { type: 'MIC_PERMISSION_GRANTED' }
  | { type: 'CHECKLIST_CONTINUED' }
  | { type: 'ENVIRONMENT_READY' }
  | { type: 'STAGE_INTRO_CONTINUED' }
  | { type: 'PAUSE_REQUESTED' }
  | { type: 'PROMPT_ADVANCED' }
  | { type: 'CELEBRATION_CONTINUED' }
  | { type: 'VOICE_PROFILE_STATUS_CHANGED'; status: string }
  | { type: 'WORKING_TIMEOUT_ELAPSED' };

export function deriveInitialView(data: RecordScreenData): RecordView {
  if (data.voiceProfileStatus === 'processing' || data.voiceProfileStatus === 'queued')
    return { type: 'working' };
  if (data.voiceProfileStatus === 'ready')
    return { type: 'ready' };
  if (data.clipsRecorded === 0)
    return { type: 'entry' };
  if (data.clipsRecorded === getStageStartIndex(2))
    return { type: 'stage-intro', stage: 2 };
  if (data.clipsRecorded === getStageStartIndex(3))
    return { type: 'stage-intro', stage: 3 };
  return { type: 'prompt', promptIndex: Math.min(data.clipsRecorded, TOTAL_PROMPT_COUNT - 1) };
}

export function recordReducer(state: RecordView, action: RecordAction): RecordView {
  switch (action.type) {
    case 'ENTRY_CONTINUED':
      if (state.type !== 'entry') return state;
      return { type: 'grounding' };

    case 'GROUNDING_CONTINUED':
      if (state.type !== 'grounding') return state;
      return { type: 'mic-permission' };

    case 'MIC_PERMISSION_GRANTED':
      if (state.type !== 'mic-permission') return state;
      return { type: 'checklist' };

    case 'CHECKLIST_CONTINUED':
      if (state.type !== 'checklist') return state;
      return { type: 'environment' };

    case 'ENVIRONMENT_READY':
      if (state.type !== 'environment') return state;
      return { type: 'stage-intro', stage: 1 };

    case 'STAGE_INTRO_CONTINUED':
      if (state.type !== 'stage-intro') return state;
      return { type: 'prompt', promptIndex: getStageStartIndex(state.stage) };

    case 'PAUSE_REQUESTED':
      if (state.type !== 'stage-intro' && state.type !== 'celebration') return state;
      return { type: 'paused' };

    case 'PROMPT_ADVANCED': {
      if (state.type !== 'prompt') return state;
      const { promptIndex } = state;
      if (ALL_PROMPTS[promptIndex]?.celebration) {
        return { type: 'celebration', afterPromptIndex: promptIndex };
      }
      return { type: 'prompt', promptIndex: promptIndex + 1 };
    }

    case 'CELEBRATION_CONTINUED': {
      if (state.type !== 'celebration') return state;
      const { afterPromptIndex } = state;
      const next = ALL_PROMPTS[afterPromptIndex]?.celebration?.next;
      if (!next) return state;
      switch (next.kind) {
        case 'next-prompt':
          return { type: 'prompt', promptIndex: afterPromptIndex + 1 };
        case 'stage-intro':
          return { type: 'stage-intro', stage: next.stage };
        case 'working':
          return { type: 'working' };
      }
      return state;
    }

    case 'VOICE_PROFILE_STATUS_CHANGED':
      if (action.status !== 'ready') return state;
      if (state.type !== 'working') return state;
      return { type: 'ready' };

    case 'WORKING_TIMEOUT_ELAPSED':
      if (state.type !== 'working') return state;
      return { type: 'ready' };
  }
}
