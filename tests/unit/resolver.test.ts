import { describe, it, expect } from 'vitest';
import { resolvePrompt, buildResolverContext } from '@/lib/voice-training/resolver';
import type { VoicePrompt, ResolverContext } from '@/lib/voice-training/types';

/**
 * Unit tests for the pure prompt resolver.
 *
 * Covers variant selection (timeOfDayName / generation / relationship),
 * placeholder replacement, fallback behavior when variant keys are missing,
 * and the buildResolverContext helper.
 */

const simplePrompt = (line: string): VoicePrompt => ({
  id: 1,
  instruction: 'Speak naturally.',
  emotionalTone: 'warm',
  lineType: 'simple',
  line,
});

const cityPrompt = (line: string): VoicePrompt => ({
  id: 2,
  instruction: 'Speak naturally.',
  emotionalTone: 'warm',
  lineType: 'city',
  line,
});

describe('resolvePrompt — simple and city lines', () => {
  it('returns the raw text for a simple prompt with no placeholders', () => {
    const prompt = simplePrompt('Just a line.');
    const { resolvedText, resolvedMeta } = resolvePrompt(prompt, {});
    expect(resolvedText).toBe('Just a line.');
    expect(resolvedMeta).toBeUndefined();
  });

  it('replaces {userName} when provided', () => {
    const prompt = simplePrompt('Hi, I am {userName}.');
    const ctx: ResolverContext = { userName: 'Ada' };
    expect(resolvePrompt(prompt, ctx).resolvedText).toBe('Hi, I am Ada.');
  });

  it('falls back to the default for {userName} when missing', () => {
    const prompt = simplePrompt('Hi, I am {userName}.');
    // The default is the curly-quoted "I\u2019m here".
    expect(resolvePrompt(prompt, {}).resolvedText).toBe('Hi, I am I\u2019m here.');
  });

  it('replaces multiple placeholders in one string', () => {
    const prompt = simplePrompt('I am {userName} from {city}.');
    const ctx: ResolverContext = { userName: 'Ada', city: 'Boston' };
    expect(resolvePrompt(prompt, ctx).resolvedText).toBe(
      'I am Ada from Boston.'
    );
  });

  it('replaces repeated occurrences of the same placeholder globally', () => {
    const prompt = simplePrompt('{userName}, {userName}, {userName}!');
    const ctx: ResolverContext = { userName: 'Ada' };
    expect(resolvePrompt(prompt, ctx).resolvedText).toBe('Ada, Ada, Ada!');
  });

  it('replaces {city} in a city-type prompt', () => {
    const prompt = cityPrompt('Walking around {city} today.');
    const ctx: ResolverContext = { city: 'Denver' };
    expect(resolvePrompt(prompt, ctx).resolvedText).toBe(
      'Walking around Denver today.'
    );
  });

  it('leaves unknown placeholders intact (no replacement for {weather})', () => {
    const prompt = simplePrompt('Today the weather is {weather}.');
    expect(resolvePrompt(prompt, {}).resolvedText).toBe(
      'Today the weather is {weather}.'
    );
  });

  it('handles an empty-string line without throwing', () => {
    const prompt = simplePrompt('');
    expect(resolvePrompt(prompt, {}).resolvedText).toBe('');
  });
});

describe('resolvePrompt — timeOfDayName variants', () => {
  const todPrompt: VoicePrompt = {
    id: 10,
    instruction: 'Speak naturally.',
    emotionalTone: 'warm',
    lineType: 'timeOfDayName',
    line: {
      morning: 'Good morning, {userName}!',
      afternoon: 'Good afternoon, {userName}!',
      evening: 'Good evening, {userName}!',
      lateNight: 'Still up, {userName}?',
    },
  };

  it('picks morning at 08:00 local time', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0); // 08:00 local
    const { resolvedText, resolvedMeta } = resolvePrompt(todPrompt, {
      userName: 'Ada',
      now,
    });
    expect(resolvedText).toBe('Good morning, Ada!');
    expect(resolvedMeta?.timeOfDayKey).toBe('morning');
  });

  it('picks afternoon at 14:00 local time', () => {
    const now = new Date(2024, 0, 15, 14, 0, 0);
    const { resolvedText, resolvedMeta } = resolvePrompt(todPrompt, {
      userName: 'Ada',
      now,
    });
    expect(resolvedText).toBe('Good afternoon, Ada!');
    expect(resolvedMeta?.timeOfDayKey).toBe('afternoon');
  });

  it('picks evening at 19:00 local time', () => {
    const now = new Date(2024, 0, 15, 19, 0, 0);
    const { resolvedMeta } = resolvePrompt(todPrompt, { now });
    expect(resolvedMeta?.timeOfDayKey).toBe('evening');
  });

  it('picks lateNight at 02:00 local time', () => {
    const now = new Date(2024, 0, 15, 2, 0, 0);
    const { resolvedMeta } = resolvePrompt(todPrompt, { now });
    expect(resolvedMeta?.timeOfDayKey).toBe('lateNight');
  });

  it('falls back to morning text when the picked variant key is missing', () => {
    const partial: VoicePrompt = {
      ...todPrompt,
      line: { morning: 'Good morning!' },
    };
    // 14:00 local → afternoon key, but map only has morning.
    const now = new Date(2024, 0, 15, 14, 0, 0);
    const { resolvedText, resolvedMeta } = resolvePrompt(partial, { now });
    expect(resolvedText).toBe('Good morning!');
    expect(resolvedMeta?.timeOfDayKey).toBe('afternoon');
  });

  it('returns empty string when no morning fallback is available', () => {
    const partial: VoicePrompt = {
      ...todPrompt,
      line: { evening: 'Evening only.' },
    };
    const now = new Date(2024, 0, 15, 14, 0, 0); // afternoon, no morning fallback
    expect(resolvePrompt(partial, { now }).resolvedText).toBe('');
  });

  it('honors an explicit timeZone when computing the hour', () => {
    // 15:00 UTC. In America/New_York (UTC-5 in January) that's 10:00 → morning.
    const now = new Date(Date.UTC(2024, 0, 15, 15, 0, 0));
    const { resolvedMeta } = resolvePrompt(todPrompt, {
      now,
      timeZone: 'America/New_York',
    });
    expect(resolvedMeta?.timeOfDayKey).toBe('morning');
  });

  it('falls back to local hour when the timeZone is invalid', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0);
    const { resolvedMeta } = resolvePrompt(todPrompt, {
      now,
      timeZone: 'Not/AZone',
    });
    expect(resolvedMeta?.timeOfDayKey).toBe('morning');
  });
});

describe('resolvePrompt — generation variants', () => {
  const genPrompt: VoicePrompt = {
    id: 20,
    instruction: 'Speak naturally.',
    emotionalTone: 'warm',
    lineType: 'generation',
    line: {
      '1950s': 'Fifties line',
      '1960s': 'Sixties line',
      '1970s': 'Seventies line',
      '1980s': 'Eighties line',
      '1990s': 'Nineties line',
      '2000s': 'Two-thousands line',
      default: 'Default generation line',
    },
  };

  it('selects the correct decade for a 1972 birth year', () => {
    const { resolvedText, resolvedMeta } = resolvePrompt(genPrompt, {
      birthYear: 1972,
    });
    expect(resolvedText).toBe('Seventies line');
    expect(resolvedMeta?.generationKey).toBe('1970s');
  });

  it('selects 1950s for a 1955 birth year', () => {
    expect(
      resolvePrompt(genPrompt, { birthYear: 1955 }).resolvedMeta?.generationKey
    ).toBe('1950s');
  });

  it('falls back to default when birthYear is out of the mapped decades', () => {
    const { resolvedText, resolvedMeta } = resolvePrompt(genPrompt, {
      birthYear: 1899,
    });
    expect(resolvedMeta?.generationKey).toBe('default');
    expect(resolvedText).toBe('Default generation line');
  });

  it('falls back to default when birthYear is missing', () => {
    expect(
      resolvePrompt(genPrompt, {}).resolvedMeta?.generationKey
    ).toBe('default');
  });
});

describe('resolvePrompt — relationship variants', () => {
  const relPrompt: VoicePrompt = {
    id: 30,
    instruction: 'Speak naturally.',
    emotionalTone: 'warm',
    lineType: 'relationship',
    line: {
      daughter: 'To my daughter',
      son: 'To my son',
      spouse: 'To my partner',
      grandchild: 'To my grandchild',
      friend: 'To my friend',
      parent: 'To my parent',
      default: 'To someone I love',
    },
  };

  it('selects daughter for relationship="daughter"', () => {
    const { resolvedText, resolvedMeta } = resolvePrompt(relPrompt, {
      relationship: 'daughter',
    });
    expect(resolvedText).toBe('To my daughter');
    expect(resolvedMeta?.relationshipKey).toBe('daughter');
  });

  it('falls back to default for an unknown relationship value', () => {
    const { resolvedText, resolvedMeta } = resolvePrompt(relPrompt, {
      relationship: 'sibling',
    });
    expect(resolvedMeta?.relationshipKey).toBe('default');
    expect(resolvedText).toBe('To someone I love');
  });

  it('also applies to relationshipGoodbye lineType', () => {
    const goodbye: VoicePrompt = {
      ...relPrompt,
      id: 31,
      lineType: 'relationshipGoodbye',
    };
    const { resolvedMeta } = resolvePrompt(goodbye, { relationship: 'spouse' });
    expect(resolvedMeta?.relationshipKey).toBe('spouse');
  });
});

describe('buildResolverContext', () => {
  it('maps non-null DB columns straight through', () => {
    const ctx = buildResolverContext(
      { display_name: 'Ada', city: 'Denver', birth_year: 1972 },
      { relationship: 'daughter' }
    );
    expect(ctx).toEqual({
      userName: 'Ada',
      city: 'Denver',
      birthYear: 1972,
      relationship: 'daughter',
    });
  });

  it('converts null columns to undefined and omits `now`', () => {
    const ctx = buildResolverContext(
      { display_name: null, city: null, birth_year: null },
      { relationship: null }
    );
    expect(ctx.userName).toBeUndefined();
    expect(ctx.city).toBeUndefined();
    expect(ctx.birthYear).toBeUndefined();
    expect(ctx.relationship).toBeUndefined();
    expect(ctx.now).toBeUndefined();
  });
});
