import React, { useState, useMemo } from 'react';
import { View, Text, Input, Textarea, Image, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import HazardCard from '@/components/HazardCard';
import { hazardTypeOptions, userOptions, mockHazards } from '@/data/hazards';
import { formatDateTime, formatDate } from '@/utils/validator';
import type { Hazard, HazardType, HazardLevel, HazardStatus, UserOption } from '@/types';

type TabKey = 'all' | HazardStatus;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待整改' },
  { key: 'rectifying', label: '整改中' },
  { key: 'recheck', label: '待复查' },
  { key: 'closed', label: '已关闭' }
];

const deadlineOptions = [
  { key: '2h', label: '2小时内', hours: 2 },
  { key: 'today', label: '今日内', hours: 8 },
  { key: 'tomorrow', label: '明日内', hours: 24 },
  { key: '3d', label: '3日内', hours: 72 }
];

const HazardsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [hazards, setHazards] = useState<Hazard[]>(mockHazards);
  const [showForm, setShowForm] = useState(false);

  const [formType, setFormType] = useState<HazardType | ''>('');
  const [formLevel, setFormLevel] = useState<HazardLevel>('major');
  const [formSection, setFormSection] = useState('A区1#楼');
  const [formLocation, setFormLocation] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formRectifier, setFormRectifier] = useState<UserOption | null>(null);
  const [formDeadline, setFormDeadline] = useState('today');

  const pendingCount = useMemo(() =>
    hazards.filter(h => h.status === 'pending' || h.status === 'rectifying' || h.status === 'recheck').length
  , [hazards]);

  const filteredHazards = useMemo(() => {
    if (activeTab === 'all') return hazards;
    return hazards.filter(h => h.status === activeTab);
  }, [hazards, activeTab]);

  const resetForm = () => {
    setFormType('');
    setFormLevel('major');
    setFormSection('A区1#楼');
    setFormLocation('');
    setFormDesc('');
    setFormPhotos([]);
    setFormRectifier(null);
    setFormDeadline('today');
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const handleAddPhoto = () => {
    Taro.chooseImage({
      count: 6 - formPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        setFormPhotos(prev => [...prev, ...res.tempFilePaths].slice(0, 6));
      }
    });
  };

  const handleDeletePhoto = (idx: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const computeDeadline = (): string => {
    const opt = deadlineOptions.find(d => d.key === formDeadline);
    if (!opt) return formatDate(new Date()) + ' 18:00';
    const d = new Date();
    d.setHours(d.getHours() + opt.hours);
    return formatDateTime(d);
  };

  const handleSubmit = () => {
    if (!formType) {
      Taro.showToast({ title: '请选择问题类型', icon: 'none' });
      return;
    }
    if (!formLocation.trim()) {
      Taro.showToast({ title: '请填写具体位置', icon: 'none' });
      return;
    }
    if (!formDesc.trim()) {
      Taro.showToast({ title: '请填写问题描述', icon: 'none' });
      return;
    }
    if (!formRectifier) {
      Taro.showToast({ title: '请指派整改人', icon: 'none' });
      return;
    }
    if (formPhotos.length === 0) {
      Taro.showModal({
        title: '提示',
        content: '建议拍摄现场照片作为证据，是否继续提交？',
        success: (res) => {
          if (res.confirm) doSubmit();
        }
      });
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    Taro.showLoading({ title: '提交中...', mask: true });
    setTimeout(() => {
      Taro.hideLoading();
      const typeOpt = hazardTypeOptions.find(o => o.key === formType);
      const levelMap: Record<HazardLevel, string> = { minor: '轻微', major: '一般', critical: '严重' };
      const deadline = computeDeadline();

      const recheckTime = new Date();
      recheckTime.setMinutes(recheckTime.getMinutes() + 30);

      const newHazard: Hazard = {
        id: 'hz-' + Date.now(),
        type: formType as HazardType,
        typeName: typeOpt?.label || '其他',
        level: formLevel,
        levelName: levelMap[formLevel],
        sectionId: 'sec-001',
        sectionName: formSection,
        location: formLocation,
        description: formDesc,
        photoUrls: formPhotos,
        reporter: '当前用户',
        reportTime: formatDateTime(new Date()),
        rectifier: formRectifier.name,
        rectifierPhone: formRectifier.phone,
        deadline,
        recheckTime: formatDateTime(recheckTime),
        status: 'pending',
        statusName: '待整改'
      };

      setHazards(prev => [newHazard, ...prev]);
      console.log('[HazardsPage] 新增隐患:', newHazard);

      Taro.showToast({ title: '上报成功', icon: 'success' });
      Taro.vibrateShort({ type: 'light' });

      setTimeout(() => {
        Taro.showModal({
          title: '复查提醒已设置',
          content: `系统将于 ${newHazard.recheckTime} 提醒您复查该隐患`,
          showCancel: false,
          confirmText: '知道了'
        });
      }, 800);

      closeForm();
    }, 800);
  };

  const levelColors: Record<HazardLevel, string> = {
    minor: 'minor',
    major: 'major',
    critical: 'critical'
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View>
          <Text className={styles.headerTitle}>隐患治理</Text>
          <Text className={styles.headerSub}>现场问题快速上报与整改追踪</Text>
        </View>
        <View className={styles.statBadge}>
          <Text className={styles.statBadgeText}>待处理 {pendingCount}</Text>
        </View>
      </View>

      <View className={styles.filterTabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.hazardList}>
        {filteredHazards.length > 0 ? (
          filteredHazards.map(h => (
            <View key={h.id}>
              {h.recheckTime && h.status !== 'closed' && (
                <View className={styles.recheckBadge}>
                  <Text className={styles.recheckBadgeText}>⏰ 复查: {h.recheckTime}</Text>
                </View>
              )}
              <HazardCard hazard={h} />
            </View>
          ))
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyText}>当前状态下暂无隐患{'\n'}点击右下角按钮上报新问题</Text>
          </View>
        )}
      </View>

      <View className={styles.fab} onClick={openForm}>
        <Text className={styles.fabIcon}>＋</Text>
      </View>

      {showForm && (
        <View className={styles.modalMask} onClick={closeForm}>
          <View className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>上报隐患</Text>
              <View className={styles.modalClose} onClick={closeForm}>
                <Text className={styles.modalCloseText}>×</Text>
              </View>
            </View>

            <ScrollView scrollY className={styles.modalBody}>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>问题类型</Text>
                <View className={styles.typeGrid}>
                  {hazardTypeOptions.map(opt => (
                    <View
                      key={opt.key}
                      className={classnames(styles.typeOption, formType === opt.key && styles.selected)}
                      onClick={() => setFormType(opt.key)}
                    >
                      <Text className={styles.typeIcon}>{opt.icon}</Text>
                      <Text className={styles.typeLabel}>{opt.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>严重程度</Text>
                <View className={styles.levelRow}>
                  {(['minor', 'major', 'critical'] as HazardLevel[]).map(lv => (
                    <View
                      key={lv}
                      className={classnames(styles.levelOption, formLevel === lv && styles.selected, levelColors[lv])}
                      onClick={() => setFormLevel(lv)}
                    >
                      <Text className={styles.levelName}>
                        {lv === 'minor' ? '轻微' : lv === 'major' ? '一般' : '严重'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>施工段</Text>
                <Input
                  className={styles.formInput}
                  placeholder="输入施工段/楼栋号"
                  value={formSection}
                  onInput={(e) => setFormSection(e.detail.value)}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>具体位置</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：3层顶板-5轴~7轴-北侧"
                  value={formLocation}
                  onInput={(e) => setFormLocation(e.detail.value)}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>问题描述</Text>
                <Textarea
                  className={styles.formTextarea}
                  placeholder="简要描述问题情况..."
                  value={formDesc}
                  onInput={(e) => setFormDesc(e.detail.value)}
                  maxlength={300}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>现场照片（最多6张）</Text>
                <View className={styles.photoList}>
                  {formPhotos.map((p, idx) => (
                    <View key={idx} className={styles.photoItem}>
                      <Image className={styles.photoImg} src={p} mode="aspectFill" />
                      <View className={styles.photoDelete} onClick={() => handleDeletePhoto(idx)}>
                        <Text>×</Text>
                      </View>
                    </View>
                  ))}
                  {formPhotos.length < 6 && (
                    <View className={styles.photoAdd} onClick={handleAddPhoto}>
                      <Text className={styles.photoAddIcon}>＋</Text>
                      <Text className={styles.photoAddText}>拍照/相册</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>指派整改人</Text>
                <View className={styles.userPicker}>
                  {userOptions.map(u => (
                    <View
                      key={u.id}
                      className={classnames(styles.userOption, formRectifier?.id === u.id && styles.selected)}
                      onClick={() => setFormRectifier(u)}
                    >
                      <View className={styles.userInfo}>
                        <Text className={styles.userName}>{u.name}</Text>
                        <Text className={styles.userRole}>{u.role}</Text>
                      </View>
                      <Text className={styles.userPhone}>{u.phone}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>整改期限</Text>
                <View className={styles.deadlineRow}>
                  {deadlineOptions.map(d => (
                    <Button
                      key={d.key}
                      className={classnames(styles.deadlineBtn, formDeadline === d.key && styles.selected)}
                      onClick={() => setFormDeadline(d.key)}
                    >
                      <Text className={styles.deadlineText}>{d.label}</Text>
                    </Button>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={closeForm}>
                <Text className={styles.cancelBtnText}>取消</Text>
              </Button>
              <Button className={styles.submitBtn} onClick={handleSubmit}>
                <Text className={styles.submitBtnText}>提交上报</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default HazardsPage;
