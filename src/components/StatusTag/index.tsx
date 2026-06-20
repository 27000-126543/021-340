import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { TaskStatus, HazardStatus, HazardLevel } from '@/types';

interface StatusTagProps {
  status: TaskStatus | HazardStatus | HazardLevel;
  text?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待检测', className: styles.pending },
  progress: { label: '进行中', className: styles.progress },
  pass: { label: '合格', className: styles.pass },
  fail: { label: '不合格', className: styles.fail },
  rectifying: { label: '整改中', className: styles.progress },
  recheck: { label: '待复查', className: styles.warning },
  closed: { label: '已关闭', className: styles.closed },
  minor: { label: '轻微', className: styles.minor },
  major: { label: '一般', className: styles.major },
  critical: { label: '严重', className: styles.critical }
};

const StatusTag: React.FC<StatusTagProps> = ({ status, text, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <View className={classnames(styles.tag, config.className, size === 'md' && styles.tagMd)}>
      <Text className={styles.text}>{text || config.label}</Text>
    </View>
  );
};

export default StatusTag;
