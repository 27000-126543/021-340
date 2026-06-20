import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import HazardCard from '@/components/HazardCard';
import StatusTag from '@/components/StatusTag';
import { useAppStore } from '@/store';
import type { Hazard, HazardStatus } from '@/types';

type TabKey = 'all' | 'recheck' | 'closed';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'recheck', label: '待复查' },
  { key: 'closed', label: '已复查' }
];

const RecheckLedgerPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewingHazard, setViewingHazard] = useState<Hazard | null>(null);

  const sections = useAppStore((s) => s.sections);
  const hazards = useAppStore((s) => s.hazards);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);

  useDidShow(() => {
    loadFromStorage();
    const sectionId = router.params.sectionId;
    if (sectionId) setSelectedSection(sectionId as string);
  });

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    hazards.forEach(h => {
      const dateStr = (h.planRecheckTime || h.recheckTime || '').split(' ')[0];
      if (dateStr) dates.add(dateStr);
    });
    return Array.from(dates).sort().reverse();
  }, [hazards]);

  const filteredHazards = useMemo(() => {
    let result = [...hazards];

    if (selectedSection) {
      result = result.filter(h => h.sectionId === selectedSection);
    }

    if (activeTab === 'recheck') {
      result = result.filter(h => h.status === 'recheck');
    } else if (activeTab === 'closed') {
      result = result.filter(h => h.status === 'closed');
    } else {
      result = result.filter(h => h.status === 'recheck' || h.status === 'closed');
    }

    if (selectedDate) {
      result = result.filter(h => {
        const dateStr = (h.planRecheckTime || h.recheckTime || '').split(' ')[0];
        return dateStr === selectedDate;
      });
    }

    return result.sort((a, b) => {
      const timeA = a.planRecheckTime || a.recheckTime || '';
      const timeB = b.planRecheckTime || b.recheckTime || '';
      return timeB.localeCompare(timeA);
    });
  }, [hazards, activeTab, selectedSection, selectedDate]);

  const stats = useMemo(() => {
    const recheck = hazards.filter(h => h.status === 'recheck').length;
    const closed = hazards.filter(h => h.status === 'closed').length;
    return { recheck, closed, total: recheck + closed };
  }, [hazards]);

  const handleSectionPicker = () => {
    const options = ['全部施工段', ...sections.map(s => s.name)];
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        if (res.tapIndex === 0) {
          setSelectedSection('');
        } else {
          setSelectedSection(sections[res.tapIndex - 1].id);
        }
      }
    });
  };

  const handleDatePicker = () => {
    const options = ['全部日期', ...dateOptions];
    if (dateOptions.length === 0) {
      Taro.showToast({ title: '暂无复查记录', icon: 'none' });
      return;
    }
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        if (res.tapIndex === 0) {
          setSelectedDate('');
        } else {
          setSelectedDate(dateOptions[res.tapIndex - 1]);
        }
      }
    });
  };

  const handleHazardClick = (hazard: Hazard) => {
    setViewingHazard(hazard);
  };

  const closeDetail = () => {
    setViewingHazard(null);
  };

  const selectedSectionName = useMemo(() => {
    if (!selectedSection) return '全部施工段';
    const s = sections.find(s => s.id === selectedSection);
    return s?.name || '全部施工段';
  }, [sections, selectedSection]);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View>
          <Text className={styles.title}>复查台账</Text>
          <Text className={styles.subtitle}>全量复查记录追踪</Text>
        </View>
        <View className={styles.statRow}>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, styles.waiting)}>{stats.recheck}</Text>
            <Text className={styles.statLabel}>待复查</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, styles.done)}>{stats.closed}</Text>
            <Text className={styles.statLabel}>已复查</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterBar}>
        <View className={styles.filterBtn} onClick={handleSectionPicker}>
          <Text className={styles.filterBtnText}>📍 {selectedSectionName}</Text>
          <Text className={styles.filterArrow}>▼</Text>
        </View>
        <View className={styles.filterBtn} onClick={handleDatePicker}>
          <Text className={styles.filterBtnText}>📅 {selectedDate || '全部日期'}</Text>
          <Text className={styles.filterArrow}>▼</Text>
        </View>
      </View>

      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.list}>
        {filteredHazards.length > 0 ? (
          filteredHazards.map(h => (
            <View key={h.id} className={styles.cardWrap} onClick={() => handleHazardClick(h)}>
              <View className={styles.cardHeader}>
                <View className={styles.cardType}>
                  <Text className={styles.cardTypeIcon}>
                    {h.type === 'fastenerLoose' && '🔩'}
                    {h.type === 'foundationWater' && '💧'}
                    {h.type === 'sensorDrop' && '📡'}
                    {h.type === 'poleBent' && '📏'}
                    {h.type === 'missingBrace' && '🧱'}
                    {h.type === 'other' && '⚠️'}
                  </Text>
                  <Text className={styles.cardTypeName}>{h.typeName}</Text>
                </View>
                <StatusTag status={h.status} text={h.statusName} />
              </View>
              <Text className={styles.cardLocation}>{h.sectionName} - {h.location}</Text>
              <View className={styles.cardMeta}>
                <Text className={styles.cardMetaItem}>
                  计划复查: {h.planRecheckTime || '-'}
                </Text>
                {h.recheckTime && (
                  <Text className={styles.cardMetaItem}>
                    实际复查: {h.recheckTime}
                  </Text>
                )}
              </View>
              <View className={styles.cardFooter}>
                <Text className={styles.cardFooterItem}>整改人: {h.rectifier}</Text>
                <Text className={styles.cardFooterItem}>复查人: {h.recheckResult?.checker || '-'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无符合条件的复查记录</Text>
          </View>
        )}
      </View>

      {viewingHazard && (
        <View className={styles.detailMask} onClick={closeDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <ScrollView scrollY className={styles.detailBody}>
              <View className={styles.detailHeader}>
                <Text className={styles.detailTitle}>复查详情</Text>
                <View className={styles.detailClose} onClick={closeDetail}>
                  <Text className={styles.detailCloseText}>×</Text>
                </View>
              </View>

              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>基本信息</Text>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>隐患类型</Text>
                  <Text className={styles.detailValue}>{viewingHazard.typeName}</Text>
                </View>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>严重程度</Text>
                  <StatusTag status={viewingHazard.level} text={viewingHazard.levelName} />
                </View>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>所在位置</Text>
                  <Text className={styles.detailValue}>{viewingHazard.sectionName} - {viewingHazard.location}</Text>
                </View>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>问题描述</Text>
                  <Text className={styles.detailValue}>{viewingHazard.description}</Text>
                </View>
              </View>

              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>整改前</Text>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>上报人</Text>
                  <Text className={styles.detailValue}>{viewingHazard.reporter} · {viewingHazard.reportTime}</Text>
                </View>
                {viewingHazard.photoUrls.length > 0 && (
                  <View className={styles.photoGrid}>
                    {viewingHazard.photoUrls.map((p, idx) => (
                      <Image key={idx} src={p} className={styles.detailPhoto} mode="aspectFill" />
                    ))}
                  </View>
                )}
              </View>

              {viewingHazard.rectification && (
                <View className={styles.detailSection}>
                  <Text className={styles.detailSectionTitle}>整改后</Text>
                  <View className={styles.detailRow}>
                    <Text className={styles.detailLabel}>整改人</Text>
                    <Text className={styles.detailValue}>{viewingHazard.rectification.rectifier} · {viewingHazard.rectification.rectifyTime}</Text>
                  </View>
                  <View className={styles.detailRow}>
                    <Text className={styles.detailLabel}>整改说明</Text>
                    <Text className={styles.detailValue}>{viewingHazard.rectification.description}</Text>
                  </View>
                  {viewingHazard.rectification.photos.length > 0 && (
                    <View className={styles.photoGrid}>
                      {viewingHazard.rectification.photos.map((p, idx) => (
                        <Image key={idx} src={p} className={styles.detailPhoto} mode="aspectFill" />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {viewingHazard.recheckResult && (
                <View className={styles.detailSection}>
                  <Text className={classnames(styles.detailSectionTitle, styles.recheckTitle)}>复查结论</Text>
                  <View className={classnames(styles.recheckResult, viewingHazard.recheckResult.passed ? styles.pass : styles.fail)}>
                    <Text className={styles.recheckResultText}>
                      {viewingHazard.recheckResult.passed ? '✅ 复查通过' : '❌ 复查不通过'}
                    </Text>
                  </View>
                  <View className={styles.detailRow}>
                    <Text className={styles.detailLabel}>复查人</Text>
                    <Text className={styles.detailValue}>{viewingHazard.recheckResult.checker} · {viewingHazard.recheckResult.checkTime}</Text>
                  </View>
                  <View className={styles.detailRow}>
                    <Text className={styles.detailLabel}>复查意见</Text>
                    <Text className={styles.detailValue}>{viewingHazard.recheckResult.remark}</Text>
                  </View>
                </View>
              )}

              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>责任人</Text>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>整改负责人</Text>
                  <Text className={styles.detailValue}>{viewingHazard.rectifier} {viewingHazard.rectifierPhone || ''}</Text>
                </View>
                <View className={styles.detailRow}>
                  <Text className={styles.detailLabel}>计划复查时间</Text>
                  <Text className={styles.detailValue}>{viewingHazard.planRecheckTime || '-'}</Text>
                </View>
                {viewingHazard.recheckTime && (
                  <View className={styles.detailRow}>
                    <Text className={styles.detailLabel}>实际复查时间</Text>
                    <Text className={styles.detailValue}>{viewingHazard.recheckTime}</Text>
                  </View>
                )}
              </View>

              <View style={{ height: '40rpx' }} />
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default RecheckLedgerPage;
