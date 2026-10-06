import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import { ExpoFileSessionStore, WakeUpSessionRepository } from '../../storage';
import type { WakeUpSession } from './session';

export type WakeUpSessionRepositoryApi = {
  getByOccurrence(occurrenceId: string): Promise<WakeUpSession | null>;
};

const WakeUpSessionRepositoryContext =
  createContext<WakeUpSessionRepositoryApi | null>(null);

export function WakeUpSessionRepositoryProvider({
  children,
  repository,
}: PropsWithChildren<{ repository?: WakeUpSessionRepositoryApi }>) {
  const fileRepository = useMemo(
    () => new WakeUpSessionRepository(new ExpoFileSessionStore()),
    [],
  );

  return (
    <WakeUpSessionRepositoryContext.Provider
      value={repository ?? fileRepository}
    >
      {children}
    </WakeUpSessionRepositoryContext.Provider>
  );
}

export function useWakeUpSessionRepository(): WakeUpSessionRepositoryApi {
  const repository = useContext(WakeUpSessionRepositoryContext);
  if (repository === null) {
    throw new Error(
      'useWakeUpSessionRepository requires WakeUpSessionRepositoryProvider.',
    );
  }
  return repository;
}
