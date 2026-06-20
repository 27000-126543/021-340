import React, { useState, useMemo } from 'react';
import { View, Text, Input, Textarea, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '@/components/StatusTag';
import { findPointByQr } from '@/data/measurePoints';
import { validateMeasure, formatDateTime } from '@/utils/validator';
import { useAppStore } from '@/store';
import type { MeasurePoint, ValidateResult } from '@/types';

const ScanPage: React.FC = () => {
  const [currentPoint, setCurrentPoint] = useState<MeasurePoint | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [measuredValue, setMeasuredValue] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);

  const measurePoints = useAppStore((s) => s.measurePoints);
  const updateTaskMeasure = useAppStore((s) => s.updateTaskMeasure);
  const updateMeasurePoint = useAppStore((s) => s.updateMeasurePoint);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);

  useDidShow(() => {
    loadFromStorage();
    console.log('[ScanPage] 页面显示，刷新数据');
  });

  const recentPoints = useMemo(
    () => measurePoints.filter(p => p.lastMeasureTime).slice(0, 5),
    [measurePoints]
  );

  const handleScan = () => {
    console.log('[ScanPage] 开始扫码');
    Taro.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        console.log('[ScanPage] 扫码结果:', res.result);
        lookupPoint(res.result);
      },
      fail: (err) => {
        console.error('[ScanPage] 扫码失败:', err);
        Taro.showToast({ title: '扫码取消或失败', icon: 'none' });
      }
    });
  };

  const handleManualLookup = () => {
    if (!manualCode.trim()) {
      Taro.showToast({ title: '请输入测点编号', icon: 'none' });
      return;
    }
    lookupPoint(manualCode.trim());
  };

  const lookupPoint = (code: string) => {
    const point = findPointByQr(code) || measurePoints.find(p => p.id === code || p.qrCode === code);
    if (point) {
      setCurrentPoint(point);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
      setManualCode('');
      Taro.vibrateShort({ type: 'light' });
    } else {
      Taro.showModal({
        title: '未找到测点',
        content: `编号「${code}」对应的测点不存在，请检查后重试`,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  };

  const handleRecentClick = (point: MeasurePoint) => {
    setCurrentPoint(point);
    setMeasuredValue('');
    setValidateResult(null);
    setRemark('');
    setPhotos([]);
  };

  const handleValueChange = (v: string) => {
    setMeasuredValue(v);
    if (currentPoint && v && !isNaN(Number(v))) {
      const result = validateMeasure(Number(v), currentPoint.standard);
      setValidateResult(result);
      if (!result.pass) {
        Taro.vibrateShort({ type: 'medium' });
      }
    } else {
      setValidateResult(null);
    }
  };

  const handleQuickNum = (num: number) => {
    handleValueChange(String(num));
  };

  const handleAddPhoto = () => {
    Taro.chooseImage({
      count: 3 - photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('[ScanPage] 选择图片:', res.tempFilePaths);
        setPhotos(prev => [...prev, ...res.tempFilePaths].slice(0, 3));
      }
    });
  };

  const handleDeletePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!currentPoint) return;
    if (!measuredValue || isNaN(Number(measuredValue))) {
      Taro.showToast({ title: '请输入实测值', icon: 'none' });
      return;
    }
    if (photos.length === 0) {
      Taro.showModal({
        title: '提示',
        content: '建议拍摄节点照片以便追溯，是否继续提交？',
        success: (res) => {
          if (res.confirm) doSubmit();
        }
      });
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    if (!currentPoint) return;

    Taro.showLoading({ title: '提交中...', mask: true });

    const numValue = Number(measuredValue);
    const pass = validateResult?.pass ?? true;

    setTimeout(() => {
      Taro.hideLoading();

      updateTaskMeasure(
        currentPoint.sectionId,
        currentPoint.standard.key,
        numValue,
        pass,
        photos
      );

      updateMeasurePoint(currentPoint.id, numValue, pass);

      Taro.showToast({
        title: pass ? '提交成功' : '已提交（不合格）',
        icon: pass ? 'success' : 'none'
      });

      console.log('[ScanPage] 提交数据:', {
        pointId: currentPoint.id,
        value: numValue,
        photos,
        remark,
        result: validateResult,
        time: formatDateTime(new Date())
      });

      setCurrentPoint(null);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
    }, 800);
  };

  const standard = currentPoint?.standard;
  const quickNums = standard ? [
    standard.standardValue - standard.allowDeviation,
    standard.standardValue,
    standard.standardValue + standard.allowDeviation
  ] : [];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.scanEntry}>
        <Text className={styles.scanTitle}>📷 扫描测点二维码</Text>
        <Text className={styles.scanDesc}>对准构件上的二维码标签，快速定位测点并录入数据</Text>
        <Button className={styles.scanButton} onClick={handleScan}>
          <Text className={styles.scanButtonText}>点击扫码</Text>
        </Button>
        <View className={styles.manualInputWrap}>
          <Input
            className={styles.manualInput}
            placeholder="或手动输入测点编号"
            placeholderStyle="color: rgba(255,255,255,0.6)"
            value={manualCode}
            onInput={(e) => setManualCode(e.detail.value)}
          />
          <Button className={styles.manualBtn} onClick={handleManualLookup}>
            <Text className={styles.manualBtnText}>查询</Text>
          </Button>
        </View>
      </View>

      {currentPoint && standard ? (
        <View>
          <View className={styles.measurePanel}>
            <View className={styles.pointHeader}>
              <Text className={styles.pointQr}>{currentPoint.qrCode}</Text>
              <Text className={styles.pointName}>{standard.name}</Text>
              <Text className={styles.pointLocation}>📍 {currentPoint.location}</Text>
              {currentPoint.lastStatus && (
                <View style={{ marginTop: '16rpx' }}>
                  <StatusTag status={currentPoint.lastStatus} size="md" />
                  {currentPoint.lastMeasuredValue !== undefined && (
                    <Text style={{ marginLeft: '16rpx', fontSize: '24rpx', color: '#94A3B8' }}>
                      上次: {currentPoint.lastMeasuredValue}{standard.unit} @ {currentPoint.lastMeasureTime}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View className={styles.standardBox}>
              <View className={styles.standardRow}>
                <Text className={styles.standardLabel}>标准值</Text>
                <Text className={styles.standardValue}>{standard.standardValue}{standard.unit}</Text>
              </View>
              <View className={styles.standardRow}>
                <Text className={styles.standardLabel}>允许偏差</Text>
                <Text className={styles.standardValue}>±{standard.allowDeviation}{standard.unit}</Text>
              </View>
              <View className={styles.standardRow}>
                <Text className={styles.standardLabel}>允许范围</Text>
                <Text className={styles.standardValue}>
                  {standard.standardValue - standard.allowDeviation} ~ {standard.standardValue + standard.allowDeviation}{standard.unit}
                </Text>
              </View>
              <Text className={styles.standardDesc}>📌 {standard.description}</Text>
            </View>

            <View className={styles.inputSection}>
              <Text className={styles.inputLabel}>实测值 ({standard.unit})</Text>
              <Input
                className={styles.measureInput}
                type="digit"
                placeholder="请输入实测数值"
                value={measuredValue}
                onInput={(e) => handleValueChange(e.detail.value)}
              />
              <View className={styles.quickNumRow}>
                {quickNums.map(n => (
                  <Button
                    key={n}
                    className={styles.quickNumBtn}
                    onClick={() => handleQuickNum(n)}
                  >
                    <Text className={styles.quickNumText}>{n}</Text>
                  </Button>
                ))}
              </View>
            </View>

            {validateResult && (
              <View className={classnames(styles.validateBox, validateResult.pass ? styles.pass : styles.fail)}>
                <View className={styles.validateRow}>
                  <Text className={styles.validateIcon}>
                    {validateResult.pass ? '✅' : '⚠️'}
                  </Text>
                  <Text className={styles.validateText}>{validateResult.message}</Text>
                </View>
              </View>
            )}

            <View className={styles.photoSection}>
              <Text className={styles.inputLabel}>节点照片（最多3张）</Text>
              <View className={styles.photoList}>
                {photos.map((p, idx) => (
                  <View key={idx} className={styles.photoItem}>
                    <Image className={styles.photoImg} src={p} mode="aspectFill" />
                    <View className={styles.photoDelete} onClick={() => handleDeletePhoto(idx)}>
                      <Text>×</Text>
                    </View>
                  </View>
                ))}
                {photos.length < 3 && (
                  <View className={styles.photoAdd} onClick={handleAddPhoto}>
                    <Text className={styles.photoAddIcon}>＋</Text>
                    <Text className={styles.photoAddText}>拍照/相册</Text>
                  </View>
                )}
              </View>
            </View>

            <View className={styles.inputSection}>
              <Text className={styles.inputLabel}>备注（可选）</Text>
              <Textarea
                className={styles.remarkInput}
                placeholder="输入备注信息..."
                value={remark}
                onInput={(e) => setRemark(e.detail.value)}
                maxlength={200}
              />
            </View>
          </View>

          <Button className={styles.submitBtn} onClick={handleSubmit}>
            <Text className={styles.submitText}>提交检测结果</Text>
          </Button>
        </View>
      ) : (
        <View>
          <Text className={styles.sectionTitle}>最近测点</Text>
          {recentPoints.length > 0 ? (
            <View className={styles.recentList}>
              {recentPoints.map(p => (
                <View key={p.id} className={styles.recentItem} onClick={() => handleRecentClick(p)}>
                  <Text className={styles.recentQr}>{p.qrCode}</Text>
                  <View className={styles.recentInfo}>
                    <Text className={styles.recentLoc}>{p.standard.name} · {p.location}</Text>
                    <Text className={styles.recentTime}>{p.lastMeasureTime} · {p.lastMeasuredValue}{p.standard.unit}</Text>
                  </View>
                  <StatusTag status={p.lastStatus || 'pending'} />
                </View>
              ))}
            </View>
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无检测记录{'\n'}请扫码开始检测</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default ScanPage;
