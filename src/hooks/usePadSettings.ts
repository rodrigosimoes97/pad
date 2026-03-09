import { useMemo } from 'react';
import type { LiveControls, PadSettings } from '../audio/audioTypes';
import { useLocalStorageState } from './useLocalStorageState';

export type InterfaceMode = 'performance' | 'studio';

type PersistedState = {
  settings: PadSettings;
  controls: LiveControls;
  displayMode: 'sharp' | 'flat';
  mode: InterfaceMode;
  advancedOpen: boolean;
};

const defaultState: PersistedState = {
  settings: {
    note: 'C',
    octave: 3,
    structure: 'root58',
    preset: 'warm'
  },
  controls: {
    volume: 0.62,
    reverb: 0.46,
    brightness: 0.55,
    hold: false
  },
  displayMode: 'sharp',
  mode: 'performance',
  advancedOpen: false
};

export const usePadSettings = () => {
  const [state, setState] = useLocalStorageState<PersistedState>('church-pad-player-v2', defaultState);

  const api = useMemo(
    () => ({
      state,
      setSettings: (settings: PadSettings) => setState((prev) => ({ ...prev, settings })),
      setControls: (controls: LiveControls) => setState((prev) => ({ ...prev, controls })),
      setDisplayMode: (displayMode: 'sharp' | 'flat') => setState((prev) => ({ ...prev, displayMode })),
      setMode: (mode: InterfaceMode) => setState((prev) => ({ ...prev, mode })),
      setAdvancedOpen: (advancedOpen: boolean) => setState((prev) => ({ ...prev, advancedOpen }))
    }),
    [state, setState]
  );

  return api;
};
