import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import MeasureItem from '@/components/MeasureItem';
import type { ConstructionSection } from '@/types';

interface TaskCardProps {
  section: ConstructionSection;
}

const TaskCard: React.FC<TaskCardProps> = ({ section }) => {
  const [expanded, setExpanded] = useState(true);

  const toggleExpand = () => setExpanded(!expanded);

  const passCount = section.tasks.filter(t => t.status === 'pass').length;
  const failCount = section.tasks.filter(t => t.status === 'fail').length;

  return (
    <View className={styles.card}>
      <View className={styles.header} onClick={toggleExpand}>
        <View className={styles.headerLeft}>
          <Text className={styles.name}>{section.name}</Text>
          <Text className={styles.floor}>{section.floor}</Text>
        </View>
        <View className={styles.headerRight}>
          <View className={styles.progressWrap}>
            <View className={styles.progressBar}>
              <View
                className={classnames(
                  styles.progressFill,
                  section.progress === 100 && styles.progressFull
                )}
                style={{ width: `${section.progress}%` }}
              />
            </View>
            <Text className={styles.progressText}>
              {section.completedTasks}/{section.totalTasks}
            </Text>
          </View>
          <Text className={classnames(styles.arrow, expanded && styles.arrowUp)}>›</Text>
        </View>
      </View>

      <View className={styles.locationRow}>
        <Text className={styles.locationText}>📍 {section.location}</Text>
        {passCount > 0 && (
          <View className={styles.statTag}>
            <Text className={styles.statPass}>✓ {passCount}</Text>
          </View>
        )}
        {failCount > 0 && (
          <View className={styles.statTagFail}>
            <Text className={styles.statFail}>✗ {failCount}</Text>
          </View>
        )}
      </View>

      {expanded && (
        <View className={styles.taskList}>
          {section.tasks.map(task => (
            <MeasureItem key={task.id} task={task} />
          ))}
        </View>
      )}
    </View>
  );
};

export default TaskCard;
