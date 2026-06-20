import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '@/components/StatusTag';
import type { TaskItem } from '@/types';

interface MeasureItemProps {
  task: TaskItem;
  onClick?: () => void;
}

const MeasureItem: React.FC<MeasureItemProps> = ({ task, onClick }) => {
  const { standard, status, measuredValue, measureTime, photoCount, remark } = task;
  const lower = standard.standardValue - standard.allowDeviation;
  const upper = standard.standardValue + standard.allowDeviation;

  const handleClick = () => {
    onClick?.();
    if (!onClick) {
      Taro.switchTab({ url: '/pages/scan/index' });
    }
  };

  return (
    <View className={classnames(styles.item, onClick !== undefined && styles.clickable)} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.titleRow}>
          <Text className={styles.name}>{task.name}</Text>
          <StatusTag status={status} />
        </View>
        <Text className={styles.standard}>
          标准: {standard.standardValue}{standard.unit} (允许±{standard.allowDeviation}{standard.unit})
        </Text>
      </View>

      {measuredValue !== undefined ? (
        <View className={styles.measureRow}>
          <View className={styles.valueBlock}>
            <Text className={styles.valueLabel}>实测值</Text>
            <Text className={classnames(styles.value, status === 'fail' && styles.valueFail, status === 'pass' && styles.valuePass)}>
              {measuredValue}{standard.unit}
            </Text>
          </View>
          <View className={styles.rangeBlock}>
            <Text className={styles.rangeLabel}>允许范围</Text>
            <Text className={styles.rangeValue}>{lower} ~ {upper}{standard.unit}</Text>
          </View>
          <View className={styles.metaBlock}>
            <Text className={classnames(styles.photoCount, photoCount > 0 && styles.photoCountHas)}>📷 {photoCount}张</Text>
            {measureTime && (
              <Text className={styles.time}>{measureTime}</Text>
            )}
          </View>
        </View>
      ) : (
        <View className={styles.unmeasured}>
          <Text className={styles.unmeasuredText}>未检测 - 点击扫码测量</Text>
        </View>
      )}

      {remark && (
        <View className={styles.remarkRow}>
          <Text className={styles.remarkLabel}>备注:</Text>
          <Text className={styles.remarkText}>{remark}</Text>
        </View>
      )}
    </View>
  );
};

export default MeasureItem;
