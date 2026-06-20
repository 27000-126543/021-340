import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type { ConstructionSection, MeasurePoint, Hazard, TaskItem, RectificationInfo, RecheckInfo } from '@/types';
import { mockSections } from '@/data/tasks';
import { mockMeasurePoints } from '@/data/measurePoints';
import { mockHazards } from '@/data/hazards';

const STORAGE_KEY = 'hzfm_inspection_store_v1';

interface AppState {
  sections: ConstructionSection[];
  measurePoints: MeasurePoint[];
  hazards: Hazard[];

  initStore: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;

  updateTaskMeasure: (
    sectionId: string,
    taskKey: string,
    value: number,
    pass: boolean,
    photos: string[],
    remark: string
  ) => void;

  updateMeasurePoint: (
    pointId: string,
    value: number,
    pass: boolean,
    photos: string[],
    remark: string
  ) => void;

  addHazard: (hazard: Hazard) => void;
  updateHazardStatus: (id: string, status: Hazard['status'], statusName: string) => void;
  submitRectification: (id: string, info: RectificationInfo) => void;
  submitRecheck: (id: string, passed: boolean, info: RecheckInfo) => void;
  checkAndUpdateRecheckStatus: () => number;

  getRecheckDueHazards: () => Hazard[];
  isRecheckOverdue: (hazard: Hazard) => boolean;
}

const ensurePhotoCount = (sections: ConstructionSection[]): ConstructionSection[] => {
  return sections.map(s => ({
    ...s,
    tasks: s.tasks.map(t => ({
      ...t,
      photoCount: t.photoCount ?? (t.photoUrl ? 1 : 0)
    }))
  }));
};

const initialState = {
  sections: ensurePhotoCount(mockSections),
  measurePoints: mockMeasurePoints,
  hazards: mockHazards
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  initStore: () => {
    const loaded = get().loadFromStorage();
    if (!loaded) {
      set({ sections: ensurePhotoCount(mockSections) });
      get().saveToStorage();
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        sections: state.sections,
        measurePoints: state.measurePoints,
        hazards: state.hazards,
        savedAt: Date.now()
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Store] 保存失败:', e);
    }
  },

  loadFromStorage: () => {
    try {
      const dataStr = Taro.getStorageSync(STORAGE_KEY);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      if (data.sections && data.measurePoints && data.hazards) {
        set({
          sections: ensurePhotoCount(data.sections),
          measurePoints: data.measurePoints,
          hazards: data.hazards
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('[Store] 加载失败:', e);
      return false;
    }
  },

  updateTaskMeasure: (sectionId, taskKey, value, pass, photos, remark) => {
    const timeStr = formatNow();

    set((state) => {
      const newSections = state.sections.map((s) => {
        if (s.id !== sectionId) return s;
        let completed = 0;
        const newTasks = s.tasks.map((t: TaskItem) => {
          if (t.key !== taskKey) {
            if (t.status === 'pass' || t.status === 'fail') completed++;
            return t;
          }
          completed++;
          return {
            ...t,
            status: pass ? 'pass' as const : 'fail' as const,
            measuredValue: value,
            measureTime: timeStr,
            photoUrl: photos[0] || '',
            photoCount: photos.length,
            remark: remark || (pass ? '符合方案要求' : '超出允许偏差，需整改')
          };
        });
        return {
          ...s,
          tasks: newTasks,
          completedTasks: completed,
          progress: Math.round((completed / s.totalTasks) * 100)
        };
      });
      return { sections: newSections };
    });

    get().saveToStorage();
  },

  updateMeasurePoint: (pointId, value, pass, photos, remark) => {
    const timeStr = formatNow();

    set((state) => {
      const point = state.measurePoints.find((p) => p.id === pointId);
      if (!point) return state;

      const otherPoints = state.measurePoints.filter((p) => p.id !== pointId);
      const updatedPoint: MeasurePoint = {
        ...point,
        lastMeasureTime: timeStr,
        lastMeasuredValue: value,
        lastStatus: pass ? 'pass' : 'fail',
        lastRecord: {
          value,
          unit: point.standard.unit,
          pass,
          time: timeStr,
          photos,
          remark: remark || ''
        }
      };

      return {
        measurePoints: [updatedPoint, ...otherPoints]
      };
    });

    get().saveToStorage();
  },

  addHazard: (hazard) => {
    set((state) => ({
      hazards: [hazard, ...state.hazards]
    }));
    get().saveToStorage();
  },

  updateHazardStatus: (id, status, statusName) => {
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? { ...h, status, statusName } : h
      )
    }));
    get().saveToStorage();
  },

  submitRectification: (id, info) => {
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? {
          ...h,
          status: 'recheck' as const,
          statusName: '待复查',
          rectification: info
        } : h
      )
    }));
    get().saveToStorage();
  },

  submitRecheck: (id, passed, info) => {
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? {
          ...h,
          status: passed ? 'closed' as const : 'rectifying' as const,
          statusName: passed ? '已关闭' : '整改中',
          recheckResult: info
        } : h
      )
    }));
    get().saveToStorage();
  },

  getRecheckDueHazards: () => {
    const now = Date.now();
    return get().hazards.filter((h) => {
      if (h.status === 'closed') return false;
      if (!h.recheckTime) return false;
      const recheckDate = new Date(h.recheckTime.replace(' ', 'T')).getTime();
      return now >= recheckDate;
    });
  },

  isRecheckOverdue: (hazard) => {
    if (hazard.status === 'closed') return false;
    if (!hazard.recheckTime) return false;
    const now = Date.now();
    const recheckDate = new Date(hazard.recheckTime.replace(' ', 'T')).getTime();
    return now >= recheckDate;
  },

  checkAndUpdateRecheckStatus: () => {
    const now = Date.now();
    let updated = 0;
    set((state) => {
      const newHazards = state.hazards.map((h) => {
        if (h.status === 'closed' || h.status === 'recheck') return h;
        if (!h.recheckTime) return h;
        const recheckDate = new Date(h.recheckTime.replace(' ', 'T')).getTime();
        if (now >= recheckDate && (h.status === 'pending' || h.status === 'rectifying')) {
          updated++;
          return { ...h, status: 'recheck' as const, statusName: '待复查' };
        }
        return h;
      });
      return { hazards: newHazards };
    });
    if (updated > 0) get().saveToStorage();
    return updated;
  }
}));

function formatNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
