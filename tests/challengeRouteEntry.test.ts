import { parseChallengeRouteEntry } from '../src/features/challenge';

describe('challenge route entry', () => {
  it('keeps the route in preview mode when no occurrence is supplied', () => {
    expect(parseChallengeRouteEntry({})).toEqual({ kind: 'preview' });
  });

  it('normalizes one persisted occurrence identifier', () => {
    expect(
      parseChallengeRouteEntry({ occurrenceId: ' occurrence-123 ' }),
    ).toEqual({ kind: 'session', occurrenceId: 'occurrence-123' });
  });

  it.each([
    [{ occurrenceId: '' }, /missing/],
    [{ occurrenceId: ['first', 'second'] }, /more than one/],
    [{ occurrenceId: `occurrence-${'x'.repeat(200)}` }, /too long/],
    [{ occurrenceId: 'occurrence\n123' }, /invalid characters/],
  ] as const)('rejects malformed route params %#', (params, message) => {
    expect(parseChallengeRouteEntry(params)).toEqual({
      kind: 'invalid',
      message: expect.stringMatching(message),
    });
  });
});
