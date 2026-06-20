import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '@/components/StatusTag';
import type { Hazard } from '@/types';

interface HazardCardProps {
  hazard: Hazard;
  onRectify?: (hazard: Hazard) => void;
  onRecheck?: (hazard: Hazard, passed: boolean) => void;
}

const HazardCard: React.FC<HazardCardProps> = ({ hazard, onRectify, onRecheck }) => {
  const canRectify = hazard.status === 'pending' || hazard.status === 'rectifying';
  const canRecheck = hazard.status === 'recheck';

  return (
    <View className={styles.card}>
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

      {hazard.status !== 'closed' && hazard.planRecheckTime && (
        <View className={styles.recheckRow}>
          <Text className={styles.recheckLabel}>⏰ 计划复查</Text>
          <Text className={classnames(styles.recheckValue, styles.recheckHighlight)}>{hazard.planRecheckTime}</Text>
        </View>
      )}

      {hazard.status === 'closed' && hazard.recheckResult && (
        <View className={classnames(styles.recheckRow, styles.recheckClosed)}>
          <Text className={styles.recheckLabel}>✅ 复查结论</Text>
          <Text className={styles.recheckValue}>
            {hazard.recheckResult.passed ? '通过' : '未通过'} · {hazard.recheckResult.checkTime}
          </Text>
        </View>
      )}

      {hazard.rectification && (
        <View className={styles.rectifyBlock}>
          <Text className={styles.rectifyTitle}>🔧 整改信息</Text>
          <View className={styles.rectifyRow}>
            <Text className={styles.rectifyLabel}>整改人</Text>
            <Text className={styles.rectifyVal}>{hazard.rectification.rectifier} · {hazard.rectification.rectifyTime}</Text>
          </View>
          <Text className={styles.rectifyDesc}>{hazard.rectification.description}</Text>
          {hazard.rectification.photos.length > 0 && (
            <Text className={styles.rectifyPhoto}>📷 整改照片 {hazard.rectification.photos.length}张</Text>
          )}
        </View>
      )}

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

      {(canRectify || canRecheck) && (
        <View className={styles.actionRow}>
          {canRectify && onRectify && (
            <View className={classnames(styles.actionBtn, styles.rectifyBtn)} onClick={() => onRectify(hazard)}>
              <Text className={styles.actionBtnText}>提交整改</Text>
            </View>
          )}
          {canRecheck && onRecheck && (
            <View className={styles.recheckActions}>
              <View className={classnames(styles.actionBtn, styles.recheckFailBtn)} onClick={() => onRecheck(hazard, false)}>
                <Text className={styles.actionBtnText}>退回整改</Text>
              </View>
              <View className={classnames(styles.actionBtn, styles.recheckPassBtn)} onClick={() => onRecheck(hazard, true)}>
                <Text className={styles.actionBtnText}>复查通过</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default HazardCard;
