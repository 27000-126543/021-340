import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import TaskCard from '@/components/TaskCard';
import { useAppStore } from '@/store';
import type { TaskStatus, SectionSummary } from '@/types';

type FilterType = 'all' | TaskStatus;
type ViewMode = 'tasks' | 'summary';

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
  const sections = useAppStore((s) => s.sections);
  const hazards = useAppStore((s) => s.hazards);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);

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
      const recheckHazards = sectionHazards.filter(h => h.status === 'recheck' || h.status === 'pending' || h.status === 'rectifying').length;
      return {
        sectionId: s.id,
        sectionName: s.name,
        pendingTasks,
        failTasks,
        recheckHazards,
        totalHazards: sectionHazards.length
      };
    });
  }, [sections, hazards]);

  const filteredSections = useMemo(() => {
    if (filter === 'all') return sections;
    return sections
      .map(s => ({
        ...s,
        tasks: s.tasks.filter(t => t.status === filter)
      }))
      .filter(s => s.tasks.length > 0);
  }, [sections, filter]);

  const handleRefresh = () => {
    loadFromStorage();
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 600);
  };

  const handleSummaryClick = (summary: SectionSummary) => {
    Taro.showActionSheet({
      itemList: [
        `查看 ${summary.sectionName} 检测任务`,
        `查看 ${summary.sectionName} 隐患记录`
      ],
      success: (res) => {
        if (res.tapIndex === 0) {
          setViewMode('tasks');
          setFilter('all');
        } else {
          Taro.switchTab({ url: '/pages/hazards/index' });
        }
      }
    });
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
          onClick={() => setViewMode('tasks')}
        >
          <Text className={styles.toggleText}>检测任务</Text>
        </View>
        <View
          className={classnames(styles.toggleBtn, viewMode === 'summary' && styles.toggleActive)}
          onClick={() => setViewMode('summary')}
        >
          <Text className={styles.toggleText}>问题汇总</Text>
        </View>
      </View>

      {viewMode === 'summary' ? (
        <View className={styles.summaryList}>
          {sectionSummaries.map(s => {
            const hasIssue = s.pendingTasks > 0 || s.failTasks > 0 || s.recheckHazards > 0;
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
                    <Text className={classnames(styles.summaryStatNum, s.recheckHazards > 0 && styles.numRecheck)}>{s.recheckHazards}</Text>
                    <Text className={styles.summaryStatLabel}>待处理隐患</Text>
                  </View>
                </View>
                <Text className={styles.summaryItemHint}>点击查看详情 →</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View>
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

          <View className={styles.sectionList}>
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
        </View>
      )}
    </ScrollView>
  );
};

export default TasksPage;
