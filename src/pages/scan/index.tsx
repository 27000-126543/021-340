import React, { useState, useMemo } from 'react';
import { View, Text, Input, Textarea, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '@/components/StatusTag';
import { findPointByQr } from '@/data/measurePoints';
import { validateMeasure, formatDateTime } from '@/utils/validator';
import { useAppStore } from '@/store';
import type { MeasurePoint, ValidateResult, MeasureRecord, MeasureDraft } from '@/types';

const ScanPage: React.FC = () => {
  const [currentPoint, setCurrentPoint] = useState<MeasurePoint | null>(null);
  const [editingDraft, setEditingDraft] = useState<MeasureDraft | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [measuredValue, setMeasuredValue] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MeasureRecord | null>(null);
  const [viewingPointName, setViewingPointName] = useState('');

  const measurePoints = useAppStore((s) => s.measurePoints);
  const drafts = useAppStore((s) => s.drafts);
  const updateTaskMeasure = useAppStore((s) => s.updateTaskMeasure);
  const updateMeasurePoint = useAppStore((s) => s.updateMeasurePoint);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const addDraft = useAppStore((s) => s.addDraft);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const submitDraft = useAppStore((s) => s.submitDraft);

  useDidShow(() => {
    loadFromStorage();
  });

  const recentPoints = useMemo(
    () => measurePoints.filter(p => p.lastMeasureTime).slice(0, 5),
    [measurePoints]
  );

  const handleScan = () => {
    Taro.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        lookupPoint(res.result);
      },
      fail: () => {
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
      setEditingDraft(null);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
      setManualCode('');
      setViewingRecord(null);
      Taro.vibrateShort({ type: 'light' });
    } else {
      Taro.showModal({
        title: '未找到测点',
        content: `编号「${code}」对应的测点不存在`,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  };

  const handleRecentClick = (point: MeasurePoint) => {
    if (point.lastRecord) {
      setViewingRecord(point.lastRecord);
      setViewingPointName(point.standard.name + ' · ' + point.location);
    } else {
      setCurrentPoint(point);
      setEditingDraft(null);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
      setViewingRecord(null);
    }
  };

  const handleDraftClick = (draft: MeasureDraft) => {
    setEditingDraft(draft);
    setCurrentPoint({
      id: draft.pointId,
      qrCode: draft.qrCode,
      sectionId: draft.sectionId,
      sectionName: draft.sectionName,
      location: draft.location,
      standard: draft.standard
    });
    setMeasuredValue(draft.value ? String(draft.value) : '');
    setRemark(draft.remark);
    setPhotos([...draft.photos]);
    if (draft.value) {
      const result = validateMeasure(draft.value, draft.standard);
      setValidateResult(result);
    } else {
      setValidateResult(null);
    }
    setViewingRecord(null);
  };

  const handleStartNewMeasure = () => {
    const point = recentPoints.find(p => p.lastRecord === viewingRecord) || measurePoints.find(p => p.lastRecord === viewingRecord);
    if (point) {
      setCurrentPoint(point);
      setEditingDraft(null);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
      setViewingRecord(null);
    }
  };

  const handleValueChange = (v: string) => {
    setMeasuredValue(v);
    const standard = currentPoint?.standard;
    if (standard && v && !isNaN(Number(v))) {
      const result = validateMeasure(Number(v), standard);
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
        setPhotos(prev => [...prev, ...res.tempFilePaths].slice(0, 3));
      }
    });
  };

  const handleDeletePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveDraft = () => {
    if (!currentPoint) return;

    if (editingDraft) {
      updateDraft(editingDraft.id, {
        value: measuredValue ? Number(measuredValue) : undefined,
        photos: [...photos],
        remark
      });
      Taro.showToast({ title: '草稿已更新', icon: 'success' });
    } else {
      const newDraft: MeasureDraft = {
        id: 'draft-' + Date.now(),
        pointId: currentPoint.id,
        qrCode: currentPoint.qrCode,
        sectionId: currentPoint.sectionId,
        sectionName: currentPoint.sectionName,
        location: currentPoint.location,
        standard: currentPoint.standard,
        value: measuredValue ? Number(measuredValue) : undefined,
        photos: [...photos],
        remark,
        savedAt: new Date().toISOString()
      };
      addDraft(newDraft);
      Taro.showToast({ title: '草稿已保存', icon: 'success' });
      setEditingDraft(newDraft);
    }
  };

  const handleDeleteDraft = () => {
    if (!editingDraft) return;
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这份草稿吗？',
      success: (res) => {
        if (res.confirm) {
          deleteDraft(editingDraft.id);
          setEditingDraft(null);
          setCurrentPoint(null);
          setMeasuredValue('');
          setValidateResult(null);
          setRemark('');
          setPhotos([]);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
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
      updateTaskMeasure(currentPoint.sectionId, currentPoint.standard.key, numValue, pass, photos, remark);
      updateMeasurePoint(currentPoint.id, numValue, pass, photos, remark);

      if (editingDraft) {
        deleteDraft(editingDraft.id);
        setEditingDraft(null);
      }

      Taro.showToast({
        title: pass ? '提交成功' : '已提交（不合格）',
        icon: pass ? 'success' : 'none'
      });

      setCurrentPoint(null);
      setMeasuredValue('');
      setValidateResult(null);
      setRemark('');
      setPhotos([]);
    }, 800);
  };

  const handleSubmitDraft = (draft: MeasureDraft) => {
    Taro.showModal({
      title: '提交草稿',
      content: '确定要提交这份草稿吗？提交后今日任务和最近记录将同步更新。',
      success: (res) => {
        if (res.confirm) {
          const result = submitDraft(draft.id);
          if (result.success) {
            Taro.showToast({ title: '提交成功', icon: 'success' });
            if (editingDraft?.id === draft.id) {
              setEditingDraft(null);
              setCurrentPoint(null);
              setMeasuredValue('');
              setValidateResult(null);
              setRemark('');
              setPhotos([]);
            }
          } else {
            Taro.showToast({ title: result.message, icon: 'none' });
          }
        }
      }
    });
  };

  const handleBackFromDraft = () => {
    setEditingDraft(null);
    setCurrentPoint(null);
    setMeasuredValue('');
    setValidateResult(null);
    setRemark('');
    setPhotos([]);
  };

  const standard = currentPoint?.standard;
  const quickNums = standard ? [
    standard.standardValue - standard.allowDeviation,
    standard.standardValue,
    standard.standardValue + standard.allowDeviation
  ] : [];

  if (viewingRecord) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.detailPanel}>
          <View className={styles.detailHeader}>
            <Text className={styles.detailTitle}>上次检测详情</Text>
            <View className={styles.detailClose} onClick={() => setViewingRecord(null)}>
              <Text className={styles.detailCloseText}>← 返回</Text>
            </View>
          </View>

          <Text className={styles.detailPointName}>{viewingPointName}</Text>

          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>实测值</Text>
            <Text className={classnames(styles.detailVal, viewingRecord.pass ? styles.valPass : styles.valFail)}>
              {viewingRecord.value}{viewingRecord.unit}
            </Text>
          </View>

          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>判定结果</Text>
            <StatusTag status={viewingRecord.pass ? 'pass' : 'fail'} size="md" />
          </View>

          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>检测时间</Text>
            <Text className={styles.detailVal}>{viewingRecord.time}</Text>
          </View>

          {viewingRecord.photos.length > 0 ? (
            <View className={styles.detailSection}>
              <Text className={styles.detailSectionLabel}>📷 检测照片 ({viewingRecord.photos.length}张)</Text>
              <View className={styles.detailPhotos}>
                {viewingRecord.photos.map((p, idx) => (
                  <View key={idx} className={styles.detailPhotoItem}>
                    <Image className={styles.detailPhotoImg} src={p} mode="aspectFill" />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className={styles.detailSection}>
              <Text className={styles.detailSectionLabel}>📷 检测照片: 无</Text>
            </View>
          )}

          {viewingRecord.remark && (
            <View className={styles.detailSection}>
              <Text className={styles.detailSectionLabel}>📝 备注</Text>
              <Text className={styles.detailRemark}>{viewingRecord.remark}</Text>
            </View>
          )}

          <Button className={styles.newMeasureBtn} onClick={handleStartNewMeasure}>
            <Text className={styles.newMeasureBtnText}>以此为基础重新检测</Text>
          </Button>
        </View>
      </ScrollView>
    );
  }

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

      {drafts.length > 0 && !currentPoint && (
        <View className={styles.draftSection}>
          <View className={styles.draftHeader}>
            <Text className={styles.draftTitle}>📝 离线草稿 ({drafts.length})</Text>
            <Text className={styles.draftHint}>有网后可一键提交</Text>
          </View>
          <View className={styles.draftList}>
            {drafts.map(draft => (
              <View key={draft.id} className={styles.draftItem}>
                <View className={styles.draftItemInfo} onClick={() => handleDraftClick(draft)}>
                  <Text className={styles.draftItemName}>{draft.standard.name}</Text>
                  <Text className={styles.draftItemLoc}>{draft.sectionName} · {draft.location}</Text>
                  <View className={styles.draftItemMeta}>
                    <Text className={styles.draftItemMetaText}>
                      {draft.value !== undefined ? `${draft.value}${draft.standard.unit}` : '未填写实测值'}
                    </Text>
                    <Text className={styles.draftItemMetaText}>
                      {draft.photos.length}张照片
                    </Text>
                    <Text className={styles.draftItemTime}>
                      {draft.savedAt.split('T')[0]}
                    </Text>
                  </View>
                </View>
                <View className={styles.draftItemActions}>
                  <View
                    className={classnames(styles.draftActionBtn, styles.draftSubmitBtn)}
                    onClick={() => handleSubmitDraft(draft)}
                  >
                    <Text className={styles.draftActionText}>提交</Text>
                  </View>
                  <View
                    className={classnames(styles.draftActionBtn, styles.draftEditBtn)}
                    onClick={() => handleDraftClick(draft)}
                  >
                    <Text className={styles.draftActionText}>编辑</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {currentPoint && standard ? (
        <View>
          {editingDraft && (
            <View className={styles.draftEditingBar}>
              <View className={styles.draftEditingInfo}>
                <Text className={styles.draftEditingIcon}>📝</Text>
                <Text className={styles.draftEditingText}>编辑草稿模式</Text>
              </View>
              <View className={styles.draftEditingClose} onClick={handleBackFromDraft}>
                <Text className={styles.draftEditingCloseText}>×</Text>
              </View>
            </View>
          )}

          <View className={styles.measurePanel}>
            <View className={styles.pointHeader}>
              <Text className={styles.pointQr}>{currentPoint.qrCode}</Text>
              <Text className={styles.pointName}>{standard.name}</Text>
              <Text className={styles.pointLocation}>📍 {currentPoint.location}</Text>
              {currentPoint.lastStatus && (
                <View style={{ marginTop: '16rpx', display: 'flex', alignItems: 'center' }}>
                  <StatusTag status={currentPoint.lastStatus} size="md" />
                  {currentPoint.lastMeasuredValue !== undefined && (
                    <Text style={{ marginLeft: '16rpx', fontSize: '24rpx', color: '#94A3B8' }}>
                      上次: {currentPoint.lastMeasuredValue}{standard.unit}
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
                  <Button key={n} className={styles.quickNumBtn} onClick={() => handleQuickNum(n)}>
                    <Text className={styles.quickNumText}>{n}</Text>
                  </Button>
                ))}
              </View>
            </View>

            {validateResult && (
              <View className={classnames(styles.validateBox, validateResult.pass ? styles.pass : styles.fail)}>
                <View className={styles.validateRow}>
                  <Text className={styles.validateIcon}>{validateResult.pass ? '✅' : '⚠️'}</Text>
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

          <View className={styles.submitActions}>
            <Button
              className={classnames(styles.actionBtn, styles.saveDraftBtn)}
              onClick={handleSaveDraft}
            >
              <Text className={styles.actionBtnText}>{editingDraft ? '更新草稿' : '保存草稿'}</Text>
            </Button>
            <Button className={classnames(styles.actionBtn, styles.submitBtn)} onClick={handleSubmit}>
              <Text className={styles.actionBtnPrimary}>提交检测结果</Text>
            </Button>
          </View>

          {editingDraft && (
            <View className={styles.deleteDraftRow}>
              <Text className={styles.deleteDraftText} onClick={handleDeleteDraft}>删除这份草稿</Text>
            </View>
          )}
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
