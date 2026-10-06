export type ChallengeRouteParams = {
  occurrenceId?: string | readonly string[];
};

export type ChallengeRouteEntry =
  | { kind: 'preview' }
  | { kind: 'session'; occurrenceId: string }
  | { kind: 'invalid'; message: string };

const maximumOccurrenceIdLength = 200;
const controlCharacters = /[\u0000-\u001f\u007f]/;

export function parseChallengeRouteEntry(
  params: ChallengeRouteParams,
): ChallengeRouteEntry {
  const value = params.occurrenceId;
  if (value === undefined) {
    return { kind: 'preview' };
  }
  if (typeof value !== 'string') {
    return {
      kind: 'invalid',
      message: 'The challenge link contains more than one occurrence ID.',
    };
  }

  const occurrenceId = value.trim();
  if (occurrenceId.length === 0) {
    return {
      kind: 'invalid',
      message: 'The challenge link is missing its occurrence ID.',
    };
  }
  if (occurrenceId.length > maximumOccurrenceIdLength) {
    return {
      kind: 'invalid',
      message: 'The challenge occurrence ID is too long.',
    };
  }
  if (controlCharacters.test(occurrenceId)) {
    return {
      kind: 'invalid',
      message: 'The challenge occurrence ID contains invalid characters.',
    };
  }

  return { kind: 'session', occurrenceId };
}
