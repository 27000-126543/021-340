import type { MeasurePoint } from '@/types';
import { measureStandards } from './tasks';

export const mockMeasurePoints: MeasurePoint[] = [
  {
    id: 'mp-001',
    qrCode: 'GZ-A001-LG-01',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: 'A区1#楼-3层顶板-1轴~3轴',
    standard: measureStandards.poleSpacing,
    lastMeasureTime: '2026-06-21 08:30',
    lastMeasuredValue: 890,
    lastStatus: 'pass'
  },
  {
    id: 'mp-002',
    qrCode: 'GZ-A001-SD-01',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: 'A区1#楼-3层顶板-北侧',
    standard: measureStandards.sweepingRod
  },
  {
    id: 'mp-003',
    qrCode: 'GZ-A001-JC-01',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: 'A区1#楼-3层顶板-东南角',
    standard: measureStandards.scissorsBrace
  },
  {
    id: 'mp-004',
    qrCode: 'GZ-A001-DT-01',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: 'A区1#楼-3层顶板-中央',
    standard: measureStandards.jackExposure
  },
  {
    id: 'mp-005',
    qrCode: 'GZ-A001-JC-02',
    sectionId: 'sec-001',
    sectionName: 'A区1#楼',
    location: 'A区1#楼-3层顶板-西南角',
    standard: measureStandards.scissorsBrace,
    lastMeasureTime: '2026-06-20 16:20',
    lastMeasuredValue: 50,
    lastStatus: 'pass'
  },
  {
    id: 'mp-006',
    qrCode: 'GZ-B002-LG-01',
    sectionId: 'sec-002',
    sectionName: 'B区2#楼',
    location: 'B区2#楼-5层梁-主梁南侧',
    standard: measureStandards.poleSpacing,
    lastMeasureTime: '2026-06-21 07:50',
    lastMeasuredValue: 920,
    lastStatus: 'pass'
  },
  {
    id: 'mp-007',
    qrCode: 'GZ-C003-MN-01',
    sectionId: 'sec-003',
    sectionName: 'C区3#楼',
    location: 'C区3#楼-地下2层-出入口',
    standard: measureStandards.monitorDevice
  }
];

export const findPointByQr = (qr: string): MeasurePoint | undefined => {
  return mockMeasurePoints.find(p => p.qrCode === qr || p.id === qr);
};
