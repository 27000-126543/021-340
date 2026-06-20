import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type {
  ConstructionSection,
  MeasurePoint,
  Hazard,
  TaskItem,
  RectificationInfo,
  RecheckInfo,
  MeasureDraft,
  SectionSummary,
  SectionInspectionSummary
} from '@/types';
import { mockSections } from '@/data/tasks';
import { mockMeasurePoints } from '@/data/measurePoints';
import { mockHazards } from '@/data/hazards';
import { validateMeasure } from '@/utils/validator';

const STORAGE_KEY = 'hzfm_inspection_store_v2';

const DEFAULT_RECHECK_HOURS = 24;

interface AppState {
  sections: ConstructionSection[];
  measurePoints: MeasurePoint[];
  hazards: Hazard[];
  drafts: MeasureDraft[];

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

  addDraft: (draft: MeasureDraft) => void;
  updateDraft: (id: string, draft: Partial<MeasureDraft>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => MeasureDraft | undefined;
  submitDraft: (id: string) => { success: boolean; message: string };

  getSectionSummaries: () => SectionSummary[];
  getSectionInspectionSummary: (sectionId: string) => SectionInspectionSummary | undefined;
  getAllInspectionSummaries: () => SectionInspectionSummary[];

  getHazardsByFilter: (filters: {
    sectionId?: string;
    status?: Hazard['status'];
    recheckDate?: string;
  }) => Hazard[];

  ensurePlanRecheckTime: () => void;

  pendingHazardSectionId: string | null;
  setPendingHazardSectionId: (sectionId: string | null) => void;
  consumePendingHazardSectionId: () => string | null;
}

const formatNow = (date?: Date): string => {
  const now = date || new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const addHours = (date: Date, hours: number): Date => {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};

const ensurePhotoCount = (sections: ConstructionSection[]): ConstructionSection[] => {
  return sections.map(s => ({
    ...s,
    tasks: s.tasks.map(t => ({
      ...t,
      photoCount: t.photoCount ?? (t.photoUrl ? 1 : 0)
    }))
  }));
};

const computePlanRecheckTime = (hazard: Hazard): string => {
  if (hazard.planRecheckTime) return hazard.planRecheckTime;
  if (hazard.recheckTime) return hazard.recheckTime;
  if (hazard.deadline) {
    try {
      const d = new Date(hazard.deadline.replace(' ', 'T'));
      if (!isNaN(d.getTime())) {
        return formatNow(addHours(d, 2));
      }
    } catch (e) {
      // ignore
    }
  }
  const d = new Date();
  d.setHours(d.getHours() + DEFAULT_RECHECK_HOURS);
  return formatNow(d);
};

const ensurePlanRecheckTimeForHazards = (hazards: Hazard[]): Hazard[] => {
  return hazards.map(h => {
    if (h.planRecheckTime) return h;
    const planTime = computePlanRecheckTime(h);
    return { ...h, planRecheckTime: planTime };
  });
};

const initialState: Omit<AppState,
  | 'initStore' | 'saveToStorage' | 'loadFromStorage'
  | 'updateTaskMeasure' | 'updateMeasurePoint'
  | 'addHazard' | 'updateHazardStatus' | 'submitRectification' | 'submitRecheck'
  | 'checkAndUpdateRecheckStatus' | 'getRecheckDueHazards' | 'isRecheckOverdue'
  | 'addDraft' | 'updateDraft' | 'deleteDraft' | 'getDraft' | 'submitDraft'
  | 'getSectionSummaries' | 'getSectionInspectionSummary' | 'getAllInspectionSummaries'
  | 'getHazardsByFilter' | 'ensurePlanRecheckTime'
> = {
  sections: ensurePhotoCount(mockSections),
  measurePoints: mockMeasurePoints,
  hazards: ensurePlanRecheckTimeForHazards(mockHazards),
  drafts: [],
  pendingHazardSectionId: null
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  initStore: () => {
    const loaded = get().loadFromStorage();
    if (!loaded) {
      set({
        sections: ensurePhotoCount(mockSections),
        hazards: ensurePlanRecheckTimeForHazards(mockHazards)
      });
      get().saveToStorage();
    } else {
      get().ensurePlanRecheckTime();
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        sections: state.sections,
        measurePoints: state.measurePoints,
        hazards: state.hazards,
        drafts: state.drafts,
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
          hazards: ensurePlanRecheckTimeForHazards(data.hazards),
          drafts: data.drafts || []
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
    const h = ensurePlanRecheckTimeForHazards([hazard])[0];
    set((state) => ({
      hazards: [h, ...state.hazards]
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
      hazards: state.hazards.map((h) => {
        if (h.id !== id) return h;
        const planTime = formatNow(addHours(new Date(), DEFAULT_RECHECK_HOURS));
        return {
          ...h,
          status: 'recheck' as const,
          statusName: '待复查',
          rectification: info,
          planRecheckTime: planTime
        };
      })
    }));
    get().saveToStorage();
  },

  submitRecheck: (id, passed, info) => {
    set((state) => ({
      hazards: state.hazards.map((h) => {
        if (h.id !== id) return h;
        return {
          ...h,
          status: passed ? 'closed' as const : 'rectifying' as const,
          statusName: passed ? '已关闭' : '整改中',
          recheckResult: info,
          recheckTime: info.checkTime
        };
      })
    }));
    get().saveToStorage();
  },

  getRecheckDueHazards: () => {
    const now = Date.now();
    return get().hazards.filter((h) => {
      if (h.status === 'closed') return false;
      const recheckDate = new Date((h.planRecheckTime || h.recheckTime || '').replace(' ', 'T')).getTime();
      return now >= recheckDate;
    });
  },

  isRecheckOverdue: (hazard) => {
    if (hazard.status === 'closed') return false;
    const timeStr = hazard.planRecheckTime || hazard.recheckTime;
    if (!timeStr) return false;
    const now = Date.now();
    const recheckDate = new Date(timeStr.replace(' ', 'T')).getTime();
    return now >= recheckDate;
  },

  checkAndUpdateRecheckStatus: () => {
    const now = Date.now();
    let updated = 0;
    set((state) => {
      const newHazards = state.hazards.map((h) => {
        if (h.status === 'closed' || h.status === 'recheck') return h;
        const timeStr = h.planRecheckTime || h.recheckTime;
        if (!timeStr) return h;
        const recheckDate = new Date(timeStr.replace(' ', 'T')).getTime();
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
  },

  addDraft: (draft) => {
    set((state) => ({
      drafts: [draft, ...state.drafts]
    }));
    get().saveToStorage();
  },

  updateDraft: (id, draft) => {
    set((state) => ({
      drafts: state.drafts.map(d =>
        d.id === id ? { ...d, ...draft, savedAt: formatNow() } : d
      )
    }));
    get().saveToStorage();
  },

  deleteDraft: (id) => {
    set((state) => ({
      drafts: state.drafts.filter(d => d.id !== id)
    }));
    get().saveToStorage();
  },

  getDraft: (id) => {
    return get().drafts.find(d => d.id === id);
  },

  submitDraft: (id) => {
    const draft = get().drafts.find(d => d.id === id);
    if (!draft) {
      return { success: false, message: '草稿不存在' };
    }
    if (draft.value === undefined) {
      return { success: false, message: '请填写实测值' };
    }

    const result = validateMeasure(draft.value, draft.standard);

    get().updateTaskMeasure(
      draft.sectionId,
      draft.standard.key,
      draft.value,
      result.pass,
      draft.photos,
      draft.remark
    );
    get().updateMeasurePoint(
      draft.pointId,
      draft.value,
      result.pass,
      draft.photos,
      draft.remark
    );
    get().deleteDraft(id);

    return { success: true, message: '提交成功' };
  },

  getSectionSummaries: () => {
    const { sections, hazards } = get();
    return sections.map(s => {
      const pendingTasks = s.tasks.filter(t => t.status === 'pending' || t.status === 'progress').length;
      const failTasks = s.tasks.filter(t => t.status === 'fail').length;
      const sectionHazards = hazards.filter(h => h.sectionId === s.id);
      const pendingRectifyHazards = sectionHazards.filter(h => h.status === 'pending' || h.status === 'rectifying').length;
      const recheckHazards = sectionHazards.filter(h => h.status === 'recheck').length;
      const closedHazards = sectionHazards.filter(h => h.status === 'closed').length;
      return {
        sectionId: s.id,
        sectionName: s.name,
        pendingTasks,
        failTasks,
        pendingRectifyHazards,
        recheckHazards,
        closedHazards,
        totalHazards: sectionHazards.length
      };
    });
  },

  getSectionInspectionSummary: (sectionId) => {
    const { sections, hazards } = get();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return undefined;

    const totalTasks = section.totalTasks;
    const pendingTasks = section.tasks.filter(t => t.status === 'pending' || t.status === 'progress').length;
    const passTasks = section.tasks.filter(t => t.status === 'pass').length;
    const failTasks = section.tasks.filter(t => t.status === 'fail').length;

    const sectionHazards = hazards.filter(h => h.sectionId === sectionId);
    const pendingRectifyHazards = sectionHazards.filter(h => h.status === 'pending' || h.status === 'rectifying').length;
    const recheckHazards = sectionHazards.filter(h => h.status === 'recheck').length;
    const closedHazards = sectionHazards.filter(h => h.status === 'closed').length;
    const totalHazards = sectionHazards.length;

    const passRate = totalTasks > 0 ? Math.round((passTasks / totalTasks) * 100) : 0;
    const hazardCloseRate = totalHazards > 0 ? Math.round((closedHazards / totalHazards) * 100) : 0;

    return {
      sectionId,
      sectionName: section.name,
      totalTasks,
      pendingTasks,
      passTasks,
      failTasks,
      pendingRectifyHazards,
      recheckHazards,
      closedHazards,
      totalHazards,
      passRate,
      hazardCloseRate
    };
  },

  getAllInspectionSummaries: () => {
    const { sections } = get();
    return sections
      .map(s => get().getSectionInspectionSummary(s.id))
      .filter((s): s is SectionInspectionSummary => s !== undefined);
  },

  getHazardsByFilter: (filters) => {
    let result = [...get().hazards];
    if (filters.sectionId) {
      result = result.filter(h => h.sectionId === filters.sectionId);
    }
    if (filters.status) {
      result = result.filter(h => h.status === filters.status);
    }
    if (filters.recheckDate) {
      result = result.filter(h => {
        const dateStr = (h.planRecheckTime || h.recheckTime || '').split(' ')[0];
        return dateStr === filters.recheckDate;
      });
    }
    return result;
  },

  ensurePlanRecheckTime: () => {
    set((state) => ({
      hazards: ensurePlanRecheckTimeForHazards(state.hazards)
    }));
    get().saveToStorage();
  },

  setPendingHazardSectionId: (sectionId) => {
    set({ pendingHazardSectionId: sectionId });
  },

  consumePendingHazardSectionId: () => {
    const id = get().pendingHazardSectionId;
    set({ pendingHazardSectionId: null });
    return id;
  }
}));
