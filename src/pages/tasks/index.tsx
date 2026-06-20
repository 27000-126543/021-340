import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import TaskCard from '@/components/TaskCard';
import { mockSections } from '@/data/tasks';
import type { ConstructionSection, TaskStatus } from '@/types';

type FilterType = 'all' | TaskStatus;

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待检测' },
  { key: 'progress', label: '进行中' },
  { key: 'pass', label: '合格' },
  { key: 'fail', label: '不合格' }
];

const TasksPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sections, setSections] = useState<ConstructionSection[]>(mockSections);

  useDidShow(() => {
    console.log('[TasksPage] 页面显示');
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
    console.log('[TasksPage] 下拉刷新');
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 600);
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
    </ScrollView>
  );
};

export default TasksPage;
