import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { downloadTextFile } from "../lib/download";
import * as A from "./actions";
import { defaultState, exportState, importState, loadState, saveState } from "./store";
import type {
  AppState,
  BodyweightEntry,
  DailyChecks,
  DayOverride,
  ImportResult,
  MealEntry,
  Settings,
  SetLog,
} from "./types";

export interface EngineSlice {
  tms: AppState["tms"];
  equipment: Settings["equipment"];
}

interface StoreApi {
  state: AppState;
  engine: EngineSlice;
  updateSettings: (patch: Partial<Settings>) => void;
  setTM: (liftId: string, quarter: number, value: number | null) => void;
  setOverride: (date: string, override: DayOverride | null) => void;
  setTrainingLog: (date: string, logs: SetLog[]) => void;
  setMealLog: (date: string, meals: MealEntry[]) => void;
  setDailyChecks: (date: string, patch: Partial<DailyChecks>) => void;
  addBodyweight: (entry: BodyweightEntry) => void;
  setPinnedDemo: (exerciseId: string, url: string | null) => void;
  exportBackup: () => void;
  importBackup: (text: string) => ImportResult;
  resetAll: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  // Persist on every change — localStorage is the backup + sync mechanism.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      engine: { tms: state.tms, equipment: state.settings.equipment },
      updateSettings: (patch) => setState((s) => A.updateSettings(s, patch)),
      setTM: (liftId, quarter, value) => setState((s) => A.setTM(s, liftId, quarter, value)),
      setOverride: (date, override) => setState((s) => A.setOverride(s, date, override)),
      setTrainingLog: (date, logs) => setState((s) => A.setTrainingLog(s, date, logs)),
      setMealLog: (date, meals) => setState((s) => A.setMealLog(s, date, meals)),
      setDailyChecks: (date, patch) => setState((s) => A.setDailyChecks(s, date, patch)),
      addBodyweight: (entry) => setState((s) => A.addBodyweight(s, entry)),
      setPinnedDemo: (exerciseId, url) => setState((s) => A.setPinnedDemo(s, exerciseId, url)),
      exportBackup: () => {
        const { filename, json } = exportState(state);
        downloadTextFile(filename, json);
      },
      importBackup: (text) => {
        const result = importState(text);
        if (result.ok) setState(result.state);
        return result;
      },
      resetAll: () => setState(defaultState()),
    }),
    [state],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
