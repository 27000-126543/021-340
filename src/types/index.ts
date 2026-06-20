export type TaskStatus = 'pending' | 'progress' | 'pass' | 'fail';

export type MeasureItemKey =
  | 'poleSpacing'
  | 'sweepingRod'
  | 'scissorsBrace'
  | 'jackExposure'
  | 'monitorDevice';

export interface MeasureStandard {
  key: MeasureItemKey;
  name: string;
  unit: string;
  standardValue: number;
  allowDeviation: number;
  minValue?: number;
  maxValue?: number;
  description: string;
}

export interface TaskItem {
  id: string;
  key: MeasureItemKey;
  name: string;
  standard: MeasureStandard;
  status: TaskStatus;
  measuredValue?: number;
  measureTime?: string;
  photoUrl?: string;
  photoCount: number;
  remark?: string;
}

export interface ConstructionSection {
  id: string;
  name: string;
  location: string;
  floor: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  tasks: TaskItem[];
}

export interface MeasureRecord {
  value: number;
  unit: string;
  pass: boolean;
  time: string;
  photos: string[];
  remark: string;
}

export interface MeasurePoint {
  id: string;
  qrCode: string;
  sectionId: string;
  sectionName: string;
  location: string;
  standard: MeasureStandard;
  lastMeasureTime?: string;
  lastMeasuredValue?: number;
  lastStatus?: TaskStatus;
  lastRecord?: MeasureRecord;
}

export type HazardType =
  | 'fastenerLoose'
  | 'foundationWater'
  | 'sensorDrop'
  | 'poleBent'
  | 'missingBrace'
  | 'other';

export type HazardLevel = 'minor' | 'major' | 'critical';

export type HazardStatus = 'pending' | 'rectifying' | 'recheck' | 'closed';

export interface RectificationInfo {
  photos: string[];
  description: string;
  rectifier: string;
  rectifyTime: string;
}

export interface RecheckInfo {
  passed: boolean;
  checker: string;
  checkTime: string;
  remark: string;
}

export interface Hazard {
  id: string;
  type: HazardType;
  typeName: string;
  level: HazardLevel;
  levelName: string;
  sectionId: string;
  sectionName: string;
  location: string;
  description: string;
  photoUrls: string[];
  reporter: string;
  reportTime: string;
  rectifier: string;
  rectifierPhone?: string;
  deadline: string;
  recheckTime?: string;
  status: HazardStatus;
  statusName: string;
  rectification?: RectificationInfo;
  recheckResult?: RecheckInfo;
}

export interface HazardTypeOption {
  key: HazardType;
  label: string;
  icon: string;
}

export interface UserOption {
  id: string;
  name: string;
  role: string;
  phone: string;
}

export interface ValidateResult {
  pass: boolean;
  deviation: number;
  deviationPercent: number;
  message: string;
}

export interface SectionSummary {
  sectionId: string;
  sectionName: string;
  pendingTasks: number;
  failTasks: number;
  recheckHazards: number;
  totalHazards: number;
}
