import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '@/components/StatusTag';
import type { Hazard } from '@/types';

interface HazardCardProps {
  hazard: Hazard;
  onClick?: () => void;
}

const HazardCard: React.FC<HazardCardProps> = ({ hazard, onClick }) => {
  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <View className={styles.typeRow}>
          <Text className={styles.typeIcon}>
            {hazard.type === 'fastenerLoose' && '🔩'}
            {hazard.type === 'foundationWater' && '💧'}
            {hazard.type === 'sensorDrop' && '📡'}
            {hazard.type === 'poleBent' && '📏'}
            {hazard.type === 'missingBrace' && '🧱'}
            {hazard.type === 'other' && '⚠️'}
          </Text>
          <Text className={styles.typeName}>{hazard.typeName}</Text>
        </View>
        <View className={styles.tagRow}>
          <StatusTag status={hazard.level} text={hazard.levelName} />
          <View style={{ width: '16rpx' }} />
          <StatusTag status={hazard.status} text={hazard.statusName} />
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionLabel}>📍 位置</Text>
        <Text className={styles.sectionValue}>{hazard.sectionName} - {hazard.location}</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionLabel}>📝 描述</Text>
        <Text className={styles.descText}>{hazard.description}</Text>
      </View>

      <View className={styles.footer}>
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>上报</Text>
          <Text className={styles.footerValue}>{hazard.reporter} · {hazard.reportTime}</Text>
        </View>
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>整改人</Text>
          <Text className={styles.footerValue}>{hazard.rectifier}</Text>
        </View>
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>截止</Text>
          <Text className={classnames(styles.footerValue, styles.deadline)}>{hazard.deadline}</Text>
        </View>
      </View>
    </View>
  );
};

export default HazardCard;
