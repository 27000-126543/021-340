import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import TaskCard from '@/components/TaskCard';
import { useAppStore } from '@/store';
import type { TaskStatus, SectionSummary, SectionInspectionSummary } from '@/types';

type FilterType = 'all' | TaskStatus;
type ViewMode = 'tasks' | 'summary' | 'sectionDetail';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待检测' },
  { key: 'progress', label: '进行中' },
  { key: 'pass', label: '合格' },
  { key: 'fail', label: '不合格' }
];

const TasksPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const sections = useAppStore((s) => s.sections);
  const hazards = useAppStore((s) => s.hazards);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const getSectionInspectionSummary = useAppStore((s) => s.getSectionInspectionSummary);
  const setPendingHazardSectionId = useAppStore((s) => s.setPendingHazardSectionId);

  useDidShow(() => {
    loadFromStorage();
  });

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let warning = 0;
    sections.forEach(s => {
      total += s.totalTasks;
      s.tasks.forEach(t => {
        if (t.status === 'pass' || t.status === 'fail') done++;
        if (t.status === 'fail') warning++;
      });
    });
    return { total, done, warning };
  }, [sections]);

  const sectionSummaries = useMemo((): SectionSummary[] => {
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
  }, [sections, hazards]);

  const activeSectionSummary = useMemo((): SectionInspectionSummary | undefined => {
    if (!activeSectionId) return undefined;
    return getSectionInspectionSummary(activeSectionId);
  }, [activeSectionId, getSectionInspectionSummary]);

  const activeSection = useMemo(() => {
    if (!activeSectionId) return undefined;
    return sections.find(s => s.id === activeSectionId);
  }, [sections, activeSectionId]);

  const filteredSections = useMemo(() => {
    if (viewMode === 'sectionDetail' && activeSection) {
      const s = activeSection;
      const filteredTasks = filter === 'all'
        ? s.tasks
        : s.tasks.filter(t => t.status === filter);
      return [{ ...s, tasks: filteredTasks }].filter(s => s.tasks.length > 0);
    }
    if (filter === 'all') return sections;
    return sections
      .map(s => ({
        ...s,
        tasks: s.tasks.filter(t => t.status === filter)
      }))
      .filter(s => s.tasks.length > 0);
  }, [sections, filter, viewMode, activeSection]);

  const handleRefresh = () => {
    loadFromStorage();
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 600);
  };

  const handleSummaryClick = (summary: SectionSummary) => {
    setActiveSectionId(summary.sectionId);
    setViewMode('sectionDetail');
    setFilter('all');
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    setActiveSectionId('');
  };

  const handleViewHazards = (sectionId: string) => {
    setPendingHazardSectionId(sectionId);
    Taro.switchTab({ url: '/pages/hazards/index' });
  };

  const handleViewLedger = (sectionId: string) => {
    Taro.navigateTo({ url: `/pages/recheckLedger/index?sectionId=${sectionId}` });
  };

  return (
    <ScrollView
      scrollY
      className={styles.page}
      refresherEnabled
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.header}>
        <Text className={styles.greeting}>2026年6月21日 星期日</Text>
        <Text className={styles.title}>今日巡检任务</Text>
      </View>

      <View className={styles.summary}>
        <View className={styles.summaryCard}>
          <Text className={classnames(styles.summaryNum, styles.total)}>{stats.total}</Text>
          <Text className={styles.summaryLabel}>总检测项</Text>
        </View>
        <View className={styles.summaryCard}>
          <Text className={classnames(styles.summaryNum, styles.done)}>{stats.done}</Text>
          <Text className={styles.summaryLabel}>已检测</Text>
        </View>
        <View className={styles.summaryCard}>
          <Text className={classnames(styles.summaryNum, styles.warning)}>{stats.warning}</Text>
          <Text className={styles.summaryLabel}>不合格</Text>
        </View>
      </View>

      <View className={styles.viewToggle}>
        <View
          className={classnames(styles.toggleBtn, viewMode === 'tasks' && styles.toggleActive)}
          onClick={() => { setViewMode('tasks'); setActiveSectionId(''); }}
        >
          <Text className={styles.toggleText}>检测任务</Text>
        </View>
        <View
          className={classnames(styles.toggleBtn, viewMode === 'summary' && styles.toggleActive)}
          onClick={() => { setViewMode('summary'); setActiveSectionId(''); }}
        >
          <Text className={styles.toggleText}>问题汇总</Text>
        </View>
      </View>

      {viewMode === 'summary' && (
        <View className={styles.summaryList}>
          {sectionSummaries.map(s => {
            const hasIssue = s.pendingTasks > 0 || s.failTasks > 0 || s.pendingRectifyHazards > 0 || s.recheckHazards > 0;
            return (
              <View
                key={s.sectionId}
                className={classnames(styles.summaryItem, hasIssue && styles.summaryItemAlert)}
                onClick={() => handleSummaryClick(s)}
              >
                <View className={styles.summaryItemHeader}>
                  <Text className={styles.summaryItemName}>{s.sectionName}</Text>
                  {hasIssue && <Text className={styles.alertDot}>!</Text>}
                </View>
                <View className={styles.summaryItemStats}>
                  <View className={styles.summaryStat}>
                    <Text className={classnames(styles.summaryStatNum, s.pendingTasks > 0 && styles.numPending)}>{s.pendingTasks}</Text>
                    <Text className={styles.summaryStatLabel}>待检测</Text>
                  </View>
                  <View className={styles.summaryStat}>
                    <Text className={classnames(styles.summaryStatNum, s.failTasks > 0 && styles.numFail)}>{s.failTasks}</Text>
                    <Text className={styles.summaryStatLabel}>不合格</Text>
                  </View>
                  <View className={styles.summaryStat}>
                    <Text className={classnames(styles.summaryStatNum, s.pendingRectifyHazards > 0 && styles.numPending)}>{s.pendingRectifyHazards}</Text>
                    <Text className={styles.summaryStatLabel}>待整改</Text>
                  </View>
                  <View className={styles.summaryStat}>
                    <Text className={classnames(styles.summaryStatNum, s.recheckHazards > 0 && styles.numRecheck)}>{s.recheckHazards}</Text>
                    <Text className={styles.summaryStatLabel}>待复查</Text>
                  </View>
                </View>
                <Text className={styles.summaryItemHint}>点击进入该施工段 →</Text>
              </View>
            );
          })}
        </View>
      )}

      {viewMode === 'sectionDetail' && activeSectionSummary && activeSection && (
        <View className={styles.sectionDetail}>
          <View className={styles.backBar} onClick={handleBackToSummary}>
            <Text className={styles.backArrow}>←</Text>
            <Text className={styles.backText}>返回问题汇总</Text>
          </View>

          <View className={styles.inspectionCard}>
            <View className={styles.inspectionCardHeader}>
              <Text className={styles.inspectionCardTitle}>📊 {activeSectionSummary.sectionName} 巡检摘要</Text>
            </View>

            <View className={styles.inspectionRow}>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numTotal)}>{activeSectionSummary.totalTasks}</Text>
                <Text className={styles.inspectionLabel}>总检测项</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numPass)}>{activeSectionSummary.passTasks}</Text>
                <Text className={styles.inspectionLabel}>合格</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numFail)}>{activeSectionSummary.failTasks}</Text>
                <Text className={styles.inspectionLabel}>不合格</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numPending)}>{activeSectionSummary.pendingTasks}</Text>
                <Text className={styles.inspectionLabel}>待检测</Text>
              </View>
            </View>

            <View className={styles.inspectionDivider} />

            <View className={styles.inspectionRow}>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numPending)}>{activeSectionSummary.pendingRectifyHazards}</Text>
                <Text className={styles.inspectionLabel}>待整改隐患</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numRecheck)}>{activeSectionSummary.recheckHazards}</Text>
                <Text className={styles.inspectionLabel}>待复查隐患</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={classnames(styles.inspectionNum, styles.numClosed)}>{activeSectionSummary.closedHazards}</Text>
                <Text className={styles.inspectionLabel}>已关闭隐患</Text>
              </View>
              <View className={styles.inspectionStat}>
                <Text className={styles.inspectionNum}>{activeSectionSummary.totalHazards}</Text>
                <Text className={styles.inspectionLabel}>隐患总数</Text>
              </View>
            </View>

            <View className={styles.inspectionRates}>
              <View className={styles.rateItem}>
                <Text className={styles.rateLabel}>合格率</Text>
                <View className={styles.rateBarWrap}>
                  <View
                    className={classnames(styles.rateBar, styles.ratePass)}
                    style={{ width: `${activeSectionSummary.passRate}%` }}
                  />
                </View>
                <Text className={styles.rateValue}>{activeSectionSummary.passRate}%</Text>
              </View>
              <View className={styles.rateItem}>
                <Text className={styles.rateLabel}>隐患关闭率</Text>
                <View className={styles.rateBarWrap}>
                  <View
                    className={classnames(styles.rateBar, styles.rateClosed)}
                    style={{ width: `${activeSectionSummary.hazardCloseRate}%` }}
                  />
                </View>
                <Text className={styles.rateValue}>{activeSectionSummary.hazardCloseRate}%</Text>
              </View>
            </View>

            <View className={styles.inspectionActions}>
              <View className={styles.inspectionActionBtn} onClick={() => handleViewHazards(activeSectionSummary.sectionId)}>
                <Text className={styles.inspectionActionText}>查看隐患</Text>
              </View>
              <View className={classnames(styles.inspectionActionBtn, styles.primaryBtn)} onClick={() => handleViewLedger(activeSectionSummary.sectionId)}>
                <Text className={styles.inspectionActionTextPrimary}>复查台账</Text>
              </View>
            </View>
          </View>

          <View className={styles.sectionTasksHeader}>
            <Text className={styles.sectionTasksTitle}>🔍 检测任务</Text>
          </View>
          <ScrollView scrollX className={styles.filterBar} showScrollbar={false}>
            {filters.map(f => (
              <View
                key={f.key}
                className={classnames(styles.filterChip, filter === f.key && styles.active)}
                onClick={() => setFilter(f.key)}
              >
                <Text className={styles.filterText}>{f.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {(viewMode === 'tasks' || viewMode === 'sectionDetail') && (
        <View className={styles.sectionList}>
          {viewMode === 'tasks' && (
            <ScrollView scrollX className={styles.filterBar} showScrollbar={false}>
              {filters.map(f => (
                <View
                  key={f.key}
                  className={classnames(styles.filterChip, filter === f.key && styles.active)}
                  onClick={() => setFilter(f.key)}
                >
                  <Text className={styles.filterText}>{f.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {filteredSections.length > 0 ? (
            filteredSections.map(section => (
              <TaskCard key={section.id} section={section} />
            ))
          ) : (
            <View className={styles.empty}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无相关任务</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default TasksPage;
