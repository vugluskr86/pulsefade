import type { ModeId } from './modes';

export type MissionId = string;

export interface MissionDefinition {
  readonly id: MissionId;
  readonly titleKey: string;
  readonly descKey: string;
  readonly target: number;
  readonly reward: number;
  /** Тип счётчика для отслеживания прогресса. */
  readonly tracker:
    | 'perfects'
    | 'bestCombo'
    | 'perfectRound'
    | 'modesPlayed'
    | 'beatRecord'
    | 'replayWatch'
    | 'roundsPlayed';
}

export interface MissionProgress {
  readonly missionId: MissionId;
  current: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface MissionsState {
  readonly progress: readonly MissionProgress[];
}

export const WEEKLY_MISSIONS: readonly MissionDefinition[] = [
  {
    id: 'perfect_25',
    titleKey: 'missions.perfect_25.title',
    descKey: 'missions.perfect_25.desc',
    target: 25,
    reward: 50,
    tracker: 'perfects',
  },
  {
    id: 'combo_20',
    titleKey: 'missions.combo_20.title',
    descKey: 'missions.combo_20.desc',
    target: 20,
    reward: 100,
    tracker: 'bestCombo',
  },
  {
    id: 'flawless',
    titleKey: 'missions.flawless.title',
    descKey: 'missions.flawless.desc',
    target: 1,
    reward: 150,
    tracker: 'perfectRound',
  },
  {
    id: 'modes_3',
    titleKey: 'missions.modes_3.title',
    descKey: 'missions.modes_3.desc',
    target: 3,
    reward: 75,
    tracker: 'modesPlayed',
  },
  {
    id: 'beat_record',
    titleKey: 'missions.beat_record.title',
    descKey: 'missions.beat_record.desc',
    target: 1,
    reward: 100,
    tracker: 'beatRecord',
  },
  {
    id: 'replay_watch',
    titleKey: 'missions.replay_watch.title',
    descKey: 'missions.replay_watch.desc',
    target: 1,
    reward: 50,
    tracker: 'replayWatch',
  },
  {
    id: 'rounds_5',
    titleKey: 'missions.rounds_5.title',
    descKey: 'missions.rounds_5.desc',
    target: 5,
    reward: 75,
    tracker: 'roundsPlayed',
  },
];

export function createInitialMissionsState(): MissionsState {
  return {
    progress: WEEKLY_MISSIONS.map((m) => ({
      missionId: m.id,
      current: 0,
      completed: false,
      rewardClaimed: false,
    })),
  };
}

export function loadMissionsState(): MissionsState {
  try {
    const raw = localStorage.getItem('pulsefade:missions');
    if (raw) {
      const parsed = JSON.parse(raw) as MissionsState;
      if (parsed && Array.isArray(parsed.progress)) {
        return parsed;
      }
    }
  } catch {
    // повреждённые данные
  }
  return createInitialMissionsState();
}

export function saveMissionsState(state: MissionsState): void {
  try {
    localStorage.setItem('pulsefade:missions', JSON.stringify(state));
  } catch {
    // игнорируем
  }
}

/** Обновить прогресс миссий на основе данных завершённого раунда. */
export function updateMissionProgress(
  state: MissionsState,
  updates: Partial<Record<MissionId, { delta?: number; set?: number }>>,
): { state: MissionsState; newlyCompleted: MissionDefinition[] } {
  const newlyCompleted: MissionDefinition[] = [];
  const defs = new Map(WEEKLY_MISSIONS.map((m) => [m.id, m]));

  const newProgress = state.progress.map((p) => {
    const update = updates[p.missionId];
    if (!update || p.completed) return p;

    const def = defs.get(p.missionId);
    if (!def) return p;

    const newCurrent = update.set !== undefined ? update.set : p.current + (update.delta ?? 0);
    const clamped = Math.min(newCurrent, def.target);
    const completed = clamped >= def.target;

    if (completed && !p.completed) {
      newlyCompleted.push(def);
    }

    return { ...p, current: clamped, completed };
  });

  return { state: { ...state, progress: newProgress }, newlyCompleted };
}

/** Пометить награду как полученную. */
export function claimMissionReward(
  state: MissionsState,
  missionId: MissionId,
): MissionsState | null {
  const def = WEEKLY_MISSIONS.find((m) => m.id === missionId);
  if (!def) return null;

  const progress = state.progress.map((p) =>
    p.missionId === missionId && p.completed && !p.rewardClaimed
      ? { ...p, rewardClaimed: true }
      : p,
  );
  return { ...state, progress };
}

/** Сумма незатребованных наград. */
export function pendingMissionRewards(state: MissionsState): number {
  return state.progress
    .filter((p) => p.completed && !p.rewardClaimed)
    .reduce((sum, p) => {
      const def = WEEKLY_MISSIONS.find((m) => m.id === p.missionId);
      return sum + (def?.reward ?? 0);
    }, 0);
}

/** Получить ID миссий, где награда ещё не запрошена. */
export function completedUnclaimedMissions(state: MissionsState): MissionDefinition[] {
  const defs = new Map(WEEKLY_MISSIONS.map((m) => [m.id, m]));
  return state.progress
    .filter((p) => p.completed && !p.rewardClaimed)
    .map((p) => defs.get(p.missionId))
    .filter((m): m is MissionDefinition => m !== undefined);
}
