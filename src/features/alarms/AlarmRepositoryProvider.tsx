import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import { AlarmRepository, ExpoFileAlarmStore } from '../../storage';
import type { Alarm } from './model';

export type AlarmRepositoryApi = {
  list(): Promise<Alarm[]>;
  get(id: string): Promise<Alarm | null>;
  save(alarm: Alarm): Promise<Alarm>;
  delete(id: string): Promise<boolean>;
};

const AlarmRepositoryContext = createContext<AlarmRepositoryApi | null>(null);

export function AlarmRepositoryProvider({
  children,
  repository,
}: PropsWithChildren<{ repository?: AlarmRepositoryApi }>) {
  const fileRepository = useMemo(
    () => new AlarmRepository(new ExpoFileAlarmStore()),
    [],
  );

  return (
    <AlarmRepositoryContext.Provider value={repository ?? fileRepository}>
      {children}
    </AlarmRepositoryContext.Provider>
  );
}

export function useAlarmRepository(): AlarmRepositoryApi {
  const repository = useContext(AlarmRepositoryContext);
  if (repository === null) {
    throw new Error('useAlarmRepository requires AlarmRepositoryProvider.');
  }
  return repository;
}
