import type { ConstructionSection, MeasureStandard } from '@/types';

export const measureStandards: Record<string, MeasureStandard> = {
  poleSpacing: {
    key: 'poleSpacing',
    name: '立杆间距',
    unit: 'mm',
    standardValue: 900,
    allowDeviation: 50,
    minValue: 800,
    maxValue: 1000,
    description: '纵横向立杆间距应符合方案要求'
  },
  sweepingRod: {
    key: 'sweepingRod',
    name: '扫地杆',
    unit: 'mm',
    standardValue: 200,
    allowDeviation: 20,
    maxValue: 250,
    description: '扫地杆距地面高度不大于200mm'
  },
  scissorsBrace: {
    key: 'scissorsBrace',
    name: '剪刀撑',
    unit: '°',
    standardValue: 45,
    allowDeviation: 10,
    minValue: 40,
    maxValue: 60,
    description: '剪刀撑斜杆与地面夹角应为45°~60°'
  },
  jackExposure: {
    key: 'jackExposure',
    name: '顶托外露长度',
    unit: 'mm',
    standardValue: 300,
    allowDeviation: 50,
    maxValue: 400,
    description: '可调托座螺杆伸出钢管顶部不得大于300mm'
  },
  monitorDevice: {
    key: 'monitorDevice',
    name: '监测设备安装',
    unit: '台',
    standardValue: 1,
    allowDeviation: 0,
    description: '监测传感器安装数量与完整性检查'
  }
};

export const mockSections: ConstructionSection[] = [
  {
    id: 'sec-001',
    name: 'A区1#楼',
    location: 'A区东侧',
    floor: '3层顶板',
    progress: 60,
    totalTasks: 5,
    completedTasks: 3,
    tasks: [
      {
        id: 'task-001-1',
        key: 'poleSpacing',
        name: '立杆间距',
        standard: measureStandards.poleSpacing,
        status: 'pass',
        measuredValue: 890,
        measureTime: '2026-06-21 08:30',
        remark: '符合方案要求'
      },
      {
        id: 'task-001-2',
        key: 'sweepingRod',
        name: '扫地杆',
        standard: measureStandards.sweepingRod,
        status: 'pass',
        measuredValue: 180,
        measureTime: '2026-06-21 08:45'
      },
      {
        id: 'task-001-3',
        key: 'scissorsBrace',
        name: '剪刀撑',
        standard: measureStandards.scissorsBrace,
        status: 'fail',
        measuredValue: 35,
        measureTime: '2026-06-21 09:10',
        remark: '角度偏小，需调整'
      },
      {
        id: 'task-001-4',
        key: 'jackExposure',
        name: '顶托外露长度',
        standard: measureStandards.jackExposure,
        status: 'pending'
      },
      {
        id: 'task-001-5',
        key: 'monitorDevice',
        name: '监测设备安装',
        standard: measureStandards.monitorDevice,
        status: 'pending'
      }
    ]
  },
  {
    id: 'sec-002',
    name: 'B区2#楼',
    location: 'B区中央',
    floor: '5层梁',
    progress: 40,
    totalTasks: 5,
    completedTasks: 2,
    tasks: [
      {
        id: 'task-002-1',
        key: 'poleSpacing',
        name: '立杆间距',
        standard: measureStandards.poleSpacing,
        status: 'pass',
        measuredValue: 920,
        measureTime: '2026-06-21 07:50'
      },
      {
        id: 'task-002-2',
        key: 'sweepingRod',
        name: '扫地杆',
        standard: measureStandards.sweepingRod,
        status: 'pending'
      },
      {
        id: 'task-002-3',
        key: 'scissorsBrace',
        name: '剪刀撑',
        standard: measureStandards.scissorsBrace,
        status: 'pending'
      },
      {
        id: 'task-002-4',
        key: 'jackExposure',
        name: '顶托外露长度',
        standard: measureStandards.jackExposure,
        status: 'progress'
      },
      {
        id: 'task-002-5',
        key: 'monitorDevice',
        name: '监测设备安装',
        standard: measureStandards.monitorDevice,
        status: 'pending'
      }
    ]
  },
  {
    id: 'sec-003',
    name: 'C区3#楼',
    location: 'C区西侧',
    floor: '地下2层顶板',
    progress: 0,
    totalTasks: 5,
    completedTasks: 0,
    tasks: [
      {
        id: 'task-003-1',
        key: 'poleSpacing',
        name: '立杆间距',
        standard: measureStandards.poleSpacing,
        status: 'pending'
      },
      {
        id: 'task-003-2',
        key: 'sweepingRod',
        name: '扫地杆',
        standard: measureStandards.sweepingRod,
        status: 'pending'
      },
      {
        id: 'task-003-3',
        key: 'scissorsBrace',
        name: '剪刀撑',
        standard: measureStandards.scissorsBrace,
        status: 'pending'
      },
      {
        id: 'task-003-4',
        key: 'jackExposure',
        name: '顶托外露长度',
        standard: measureStandards.jackExposure,
        status: 'pending'
      },
      {
        id: 'task-003-5',
        key: 'monitorDevice',
        name: '监测设备安装',
        standard: measureStandards.monitorDevice,
        status: 'pending'
      }
    ]
  }
];
