import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type { ConstructionSection, MeasurePoint, Hazard, TaskItem } from '@/types';
import { mockSections, measureStandards } from '@/data/tasks';
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
    photos: string[]
  ) => void;

  updateMeasurePoint: (
    pointId: string,
    value: number,
    pass: boolean
  ) => void;

  addHazard: (hazard: Hazard) => void;
  updateHazardStatus: (id: string, status: Hazard['status'], statusName: string) => void;
  checkAndUpdateRecheckStatus: () => number;

  getRecheckDueHazards: () => Hazard[];
  isRecheckOverdue: (hazard: Hazard) => boolean;
}

const initialState = {
  sections: mockSections,
  measurePoints: mockMeasurePoints,
  hazards: mockHazards
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  initStore: () => {
    const loaded = get().loadFromStorage();
    if (!loaded) {
      console.log('[Store] 使用初始Mock数据');
      get().saveToStorage();
    } else {
      console.log('[Store] 从本地存储加载数据成功');
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
      console.log('[Store] 数据已持久化到本地存储');
    } catch (e) {
      console.error('[Store] 保存到本地存储失败:', e);
    }
  },

  loadFromStorage: () => {
    try {
      const dataStr = Taro.getStorageSync(STORAGE_KEY);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      if (data.sections && data.measurePoints && data.hazards) {
        set({
          sections: data.sections,
          measurePoints: data.measurePoints,
          hazards: data.hazards
        });
        console.log('[Store] 从本地存储加载完成, savedAt:', new Date(data.savedAt || 0).toLocaleString());
        return true;
      }
      return false;
    } catch (e) {
      console.error('[Store] 从本地存储加载失败:', e);
      return false;
    }
  },

  updateTaskMeasure: (sectionId, taskKey, value, pass, photos) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
            photoUrl: photos[0],
            remark: pass ? '符合方案要求' : '超出允许偏差，需整改'
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
    console.log('[Store] 任务检测值已更新:', { sectionId, taskKey, value, pass, photoCount: photos.length });
  },

  updateMeasurePoint: (pointId, value, pass) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    set((state) => {
      const point = state.measurePoints.find((p) => p.id === pointId);
      if (!point) return state;

      const otherPoints = state.measurePoints.filter((p) => p.id !== pointId);
      const updatedPoint: MeasurePoint = {
        ...point,
        lastMeasureTime: timeStr,
        lastMeasuredValue: value,
        lastStatus: pass ? 'pass' : 'fail'
      };

      return {
        measurePoints: [updatedPoint, ...otherPoints]
      };
    });

    get().saveToStorage();
    console.log('[Store] 测点数据已更新:', { pointId, value, pass });
  },

  addHazard: (hazard) => {
    set((state) => ({
      hazards: [hazard, ...state.hazards]
    }));
    get().saveToStorage();
    console.log('[Store] 隐患已新增:', hazard.id, hazard.typeName);
  },

  updateHazardStatus: (id, status, statusName) => {
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? { ...h, status, statusName } : h
      )
    }));
    get().saveToStorage();
    console.log('[Store] 隐患状态已更新:', { id, status });
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
        if (h.status === 'closed') return h;
        if (!h.recheckTime) return h;
        if (h.status === 'recheck') return h;
        const recheckDate = new Date(h.recheckTime.replace(' ', 'T')).getTime();
        if (now >= recheckDate && (h.status === 'pending' || h.status === 'rectifying')) {
          updated++;
          return { ...h, status: 'recheck' as const, statusName: '待复查' };
        }
        return h;
      });
      return { hazards: newHazards };
    });
    if (updated > 0) {
      get().saveToStorage();
      console.log('[Store] 复查时间到期，已更新', updated, '条隐患状态为待复查');
    }
    return updated;
  }
}));
