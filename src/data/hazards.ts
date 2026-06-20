import type { Hazard, HazardTypeOption, UserOption } from '@/types';

export const hazardTypeOptions: HazardTypeOption[] = [
  { key: 'fastenerLoose', label: '扣件松动', icon: '🔩' },
  { key: 'foundationWater', label: '基础积水', icon: '💧' },
  { key: 'sensorDrop', label: '传感器脱落', icon: '📡' },
  { key: 'poleBent', label: '立杆弯曲', icon: '📏' },
  { key: 'missingBrace', label: '缺少支撑', icon: '🧱' },
  { key: 'other', label: '其他问题', icon: '⚠️' }
];

export const userOptions: UserOption[] = [
  { id: 'u001', name: '张建国', role: '架子班组长', phone: '13800138001' },
  { id: 'u002', name: '李明辉', role: '架子班组长', phone: '13800138002' },
  { id: 'u003', name: '王大伟', role: '施工员', phone: '13800138003' },
  { id: 'u004', name: '赵安全', role: '安全员', phone: '13800138004' }
];

export const mockHazards: Hazard[] = [
  {
    id: 'hz-001',
    type: 'fastenerLoose',
    typeName: '扣件松动',
    level: 'major',
    levelName: '一般',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: '3层顶板-北侧-5轴~7轴',
    description: '发现3处扣件松动，需重新拧紧',
    photoUrls: [],
    reporter: '赵安全',
    reportTime: '2026-06-21 09:20',
    rectifier: '张建国',
    rectifierPhone: '13800138001',
    deadline: '2026-06-21 18:00',
    status: 'rectifying',
    statusName: '整改中'
  },
  {
    id: 'hz-002',
    type: 'foundationWater',
    typeName: '基础积水',
    level: 'critical',
    levelName: '严重',
    sectionId: 'sec-003',
    sectionName: 'C区3#楼',
    location: '地下2层-西南角',
    description: '基础有明显积水，约5cm深，影响立杆基础稳定性',
    photoUrls: [],
    reporter: '王大伟',
    reportTime: '2026-06-21 08:10',
    rectifier: '李明辉',
    rectifierPhone: '13800138002',
    deadline: '2026-06-21 12:00',
    status: 'recheck',
    statusName: '待复查',
    recheckTime: '2026-06-21 14:00'
  },
  {
    id: 'hz-003',
    type: 'sensorDrop',
    typeName: '传感器脱落',
    level: 'minor',
    levelName: '轻微',
    sectionId: 'sec-002',
    sectionName: 'B区2#楼',
    location: '5层梁-应力传感器#3',
    description: '应力传感器移位脱落，需重新固定并校准',
    photoUrls: [],
    reporter: '赵安全',
    reportTime: '2026-06-20 17:30',
    rectifier: '张建国',
    rectifierPhone: '13800138001',
    deadline: '2026-06-21 10:00',
    status: 'closed',
    statusName: '已关闭',
    recheckTime: '2026-06-21 09:45'
  },
  {
    id: 'hz-004',
    type: 'poleBent',
    typeName: '立杆弯曲',
    level: 'critical',
    levelName: '严重',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: '3层顶板-4轴',
    description: '一根立杆有明显弯曲变形，需更换',
    photoUrls: [],
    reporter: '王大伟',
    reportTime: '2026-06-21 10:05',
    rectifier: '李明辉',
    rectifierPhone: '13800138002',
    deadline: '2026-06-21 15:00',
    status: 'pending',
    statusName: '待整改'
  }
];
