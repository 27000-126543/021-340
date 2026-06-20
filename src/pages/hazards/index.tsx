import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Input, Textarea, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import HazardCard from '@/components/HazardCard';
import { hazardTypeOptions, userOptions } from '@/data/hazards';
import { formatDateTime } from '@/utils/validator';
import { useAppStore } from '@/store';
import type { Hazard, HazardType, HazardLevel, HazardStatus, UserOption, RectificationInfo, RecheckInfo } from '@/types';

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
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [showRectifyForm, setShowRectifyForm] = useState(false);
  const [showRecheckForm, setShowRecheckForm] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [recheckAlert, setRecheckAlert] = useState<Hazard[]>([]);

  const [formType, setFormType] = useState<HazardType | ''>('');
  const [formLevel, setFormLevel] = useState<HazardLevel>('major');
  const [formSection, setFormSection] = useState('A区1#楼');
  const [formLocation, setFormLocation] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formRectifier, setFormRectifier] = useState<UserOption | null>(null);
  const [formDeadline, setFormDeadline] = useState('today');

  const [rectifyPhotos, setRectifyPhotos] = useState<string[]>([]);
  const [rectifyDesc, setRectifyDesc] = useState('');

  const [recheckRemark, setRecheckRemark] = useState('');
  const [recheckPassed, setRecheckPassed] = useState(true);

  const hazards = useAppStore((s) => s.hazards);
  const sections = useAppStore((s) => s.sections);
  const addHazard = useAppStore((s) => s.addHazard);
  const submitRectification = useAppStore((s) => s.submitRectification);
  const submitRecheck = useAppStore((s) => s.submitRecheck);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const checkAndUpdateRecheckStatus = useAppStore((s) => s.checkAndUpdateRecheckStatus);
  const isRecheckOverdue = useAppStore((s) => s.isRecheckOverdue);
  const consumePendingHazardSectionId = useAppStore((s) => s.consumePendingHazardSectionId);

  const checkRecheckAlerts = () => {
    const updated = checkAndUpdateRecheckStatus();
    if (updated > 0) {
      setTimeout(() => {
        Taro.vibrateShort({ type: 'heavy' });
        Taro.showToast({ title: `${updated}条隐患到复查时间`, icon: 'none', duration: 2500 });
      }, 300);
    }
    const due = hazards.filter(h => isRecheckOverdue(h));
    setRecheckAlert(due);
  };

  useDidShow(() => {
    loadFromStorage();
    const pendingSectionId = consumePendingHazardSectionId();
    if (pendingSectionId) {
      setActiveSectionId(pendingSectionId);
    }
    setTimeout(() => { checkRecheckAlerts(); }, 200);
  });

  useEffect(() => {
    const due = hazards.filter(h => isRecheckOverdue(h));
    setRecheckAlert(due);
  }, [hazards, isRecheckOverdue]);

  const pendingCount = useMemo(() =>
    hazards.filter(h => h.status === 'pending' || h.status === 'rectifying' || h.status === 'recheck').length
  , [hazards]);

  const recheckCount = useMemo(() => recheckAlert.length, [recheckAlert]);

  const filteredHazards = useMemo(() => {
    let result = hazards;
    if (activeSectionId) {
      result = result.filter(h => h.sectionId === activeSectionId);
    }
    if (activeTab !== 'all') {
      result = result.filter(h => h.status === activeTab);
    }
    return result;
  }, [hazards, activeTab, activeSectionId]);

  const resetForm = () => {
    setFormType(''); setFormLevel('major'); setFormSection('A区1#楼');
    setFormLocation(''); setFormDesc(''); setFormPhotos([]);
    setFormRectifier(null); setFormDeadline('today');
  };

  const openForm = () => { resetForm(); setShowForm(true); };
  const closeForm = () => { setShowForm(false); };

  const handleRectify = (hazard: Hazard) => {
    setSelectedHazard(hazard);
    setRectifyPhotos([]);
    setRectifyDesc('');
    setShowRectifyForm(true);
  };

  const handleRecheck = (hazard: Hazard, passed: boolean) => {
    setSelectedHazard(hazard);
    setRecheckRemark('');
    setRecheckPassed(passed);
    setShowRecheckForm(true);
  };

  const handleAddPhoto = (setter: React.Dispatch<React.SetStateAction<string[]>>, max: number) => {
    return () => {
      const current = showRectifyForm ? rectifyPhotos : formPhotos;
      Taro.chooseImage({
        count: max - current.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          setter(prev => [...prev, ...res.tempFilePaths].slice(0, max));
        }
      });
    };
  };

  const deletePhoto = (idx: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== idx));
  };

  const computeDeadline = (): string => {
    const opt = deadlineOptions.find(d => d.key === formDeadline);
    if (!opt) return formatDateTime(new Date(new Date().setHours(18, 0, 0, 0)));
    const d = new Date();
    d.setHours(d.getHours() + opt.hours);
    return formatDateTime(d);
  };

  const doSubmit = () => {
    Taro.showLoading({ title: '提交中...', mask: true });
    setTimeout(() => {
      Taro.hideLoading();
      const typeOpt = hazardTypeOptions.find(o => o.key === formType);
      const levelMap: Record<HazardLevel, string> = { minor: '轻微', major: '一般', critical: '严重' };
      const deadline = computeDeadline();
      const d = new Date(); d.setMinutes(d.getMinutes() + 30);

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
        rectifier: formRectifier!.name,
        rectifierPhone: formRectifier!.phone,
        deadline,
        recheckTime: formatDateTime(d),
        status: 'pending',
        statusName: '待整改'
      };

      addHazard(newHazard);
      Taro.showToast({ title: '上报成功', icon: 'success' });
      Taro.vibrateShort({ type: 'light' });
      setTimeout(() => {
        Taro.showModal({
          title: '复查提醒已设置',
          content: `系统将于 ${newHazard.recheckTime} 自动提醒您复查该隐患`,
          showCancel: false,
          confirmText: '知道了'
        });
        checkRecheckAlerts();
      }, 800);
      closeForm();
    }, 800);
  };

  const doSubmitRectify = () => {
    if (!selectedHazard) return;
    if (!rectifyDesc.trim()) {
      Taro.showToast({ title: '请填写整改说明', icon: 'none' });
      return;
    }
    Taro.showLoading({ title: '提交中...', mask: true });
    setTimeout(() => {
      Taro.hideLoading();
      const info: RectificationInfo = {
        photos: rectifyPhotos,
        description: rectifyDesc,
        rectifier: selectedHazard.rectifier,
        rectifyTime: formatDateTime(new Date())
      };
      submitRectification(selectedHazard.id, info);
      Taro.showToast({ title: '整改已提交', icon: 'success' });
      setShowRectifyForm(false);
      setSelectedHazard(null);
    }, 600);
  };

  const doSubmitRecheck = () => {
    if (!selectedHazard) return;
    Taro.showLoading({ title: '提交中...', mask: true });
    setTimeout(() => {
      Taro.hideLoading();
      const info: RecheckInfo = {
        passed: recheckPassed,
        checker: '当前用户',
        checkTime: formatDateTime(new Date()),
        remark: recheckRemark || (recheckPassed ? '复查通过' : '复查不通过，需继续整改')
      };
      submitRecheck(selectedHazard.id, recheckPassed, info);
      Taro.showToast({
        title: recheckPassed ? '复查通过，隐患已关闭' : '已退回继续整改',
        icon: recheckPassed ? 'success' : 'none'
      });
      setShowRecheckForm(false);
      setSelectedHazard(null);
    }, 600);
  };

  const levelColors: Record<HazardLevel, string> = { minor: 'minor', major: 'major', critical: 'critical' };

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

      <View className={styles.ledgerEntry} onClick={() => Taro.navigateTo({ url: '/pages/recheckLedger/index' })}>
        <View className={styles.ledgerEntryIcon}><Text className={styles.ledgerEntryIconText}>📋</Text></View>
        <View className={styles.ledgerEntryContent}>
          <Text className={styles.ledgerEntryTitle}>复查台账</Text>
          <Text className={styles.ledgerEntryDesc}>按施工段、日期查看所有复查记录</Text>
        </View>
        <Text className={styles.ledgerEntryArrow}>→</Text>
      </View>

      {recheckCount > 0 && (
        <View className={styles.recheckAlertBar}>
          <View className={styles.recheckAlertIcon}><Text className={styles.recheckAlertIconText}>⏰</Text></View>
          <View className={styles.recheckAlertContent}>
            <Text className={styles.recheckAlertTitle}>有 {recheckCount} 条隐患需复查</Text>
            <Text className={styles.recheckAlertDesc}>复查时间已到，请前往现场核实整改情况</Text>
          </View>
          <View className={styles.recheckAlertBtn} onClick={() => setActiveTab('recheck')}>
            <Text className={styles.recheckAlertBtnText}>去查看</Text>
          </View>
        </View>
      )}

      <View className={styles.sectionFilter}>
        <ScrollView scrollX className={styles.sectionScroll} showScrollbar={false}>
          <View
            className={classnames(styles.sectionChip, !activeSectionId && styles.active)}
            onClick={() => setActiveSectionId('')}
          >
            <Text className={styles.sectionChipText}>全部施工段</Text>
          </View>
          {sections.map(s => (
            <View
              key={s.id}
              className={classnames(styles.sectionChip, activeSectionId === s.id && styles.active)}
              onClick={() => setActiveSectionId(s.id)}
            >
              <Text className={styles.sectionChipText}>{s.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.filterTabs}>
        {tabs.map(tab => (
          <View key={tab.key} className={classnames(styles.tabItem, activeTab === tab.key && styles.active)} onClick={() => setActiveTab(tab.key)}>
            <Text className={styles.tabText}>
              {tab.label}{tab.key === 'recheck' && recheckCount > 0 ? ` (${recheckCount})` : ''}
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.hazardList}>
        {filteredHazards.length > 0 ? (
          filteredHazards.map(h => {
            const overdue = isRecheckOverdue(h);
            return (
              <View key={h.id} className={classnames(overdue && styles.hazardItemOverdue)}>
                {overdue && (
                  <View className={styles.overdueBadge}>
                    <Text className={styles.overdueBadgeText}>⏰ 复查时间已到</Text>
                  </View>
                )}
                <HazardCard hazard={h} onRectify={handleRectify} onRecheck={handleRecheck} />
              </View>
            );
          })
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
              <View className={styles.modalClose} onClick={closeForm}><Text className={styles.modalCloseText}>×</Text></View>
            </View>
            <ScrollView scrollY className={styles.modalBody}>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>问题类型</Text>
                <View className={styles.typeGrid}>
                  {hazardTypeOptions.map(opt => (
                    <View key={opt.key} className={classnames(styles.typeOption, formType === opt.key && styles.selected)} onClick={() => setFormType(opt.key)}>
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
                    <View key={lv} className={classnames(styles.levelOption, formLevel === lv && styles.selected, levelColors[lv])} onClick={() => setFormLevel(lv)}>
                      <Text className={styles.levelName}>{lv === 'minor' ? '轻微' : lv === 'major' ? '一般' : '严重'}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>施工段</Text>
                <Input className={styles.formInput} placeholder="输入施工段/楼栋号" value={formSection} onInput={(e) => setFormSection(e.detail.value)} />
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>具体位置</Text>
                <Input className={styles.formInput} placeholder="如：3层顶板-5轴~7轴-北侧" value={formLocation} onInput={(e) => setFormLocation(e.detail.value)} />
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>问题描述</Text>
                <Textarea className={styles.formTextarea} placeholder="简要描述问题情况..." value={formDesc} onInput={(e) => setFormDesc(e.detail.value)} maxlength={300} />
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>现场照片（最多6张）</Text>
                <View className={styles.photoList}>
                  {formPhotos.map((p, idx) => (
                    <View key={idx} className={styles.photoItem}>
                      <Image className={styles.photoImg} src={p} mode="aspectFill" />
                      <View className={styles.photoDelete} onClick={() => deletePhoto(idx, setFormPhotos)}><Text>×</Text></View>
                    </View>
                  ))}
                  {formPhotos.length < 6 && (
                    <View className={styles.photoAdd} onClick={handleAddPhoto(setFormPhotos, 6)}>
                      <Text className={styles.photoAddIcon}>＋</Text><Text className={styles.photoAddText}>拍照/相册</Text>
                    </View>
                  )}
                </View>
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>指派整改人</Text>
                <View className={styles.userPicker}>
                  {userOptions.map(u => (
                    <View key={u.id} className={classnames(styles.userOption, formRectifier?.id === u.id && styles.selected)} onClick={() => setFormRectifier(u)}>
                      <View className={styles.userInfo}><Text className={styles.userName}>{u.name}</Text><Text className={styles.userRole}>{u.role}</Text></View>
                      <Text className={styles.userPhone}>{u.phone}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>整改期限</Text>
                <View className={styles.deadlineRow}>
                  {deadlineOptions.map(d => (
                    <Button key={d.key} className={classnames(styles.deadlineBtn, formDeadline === d.key && styles.selected)} onClick={() => setFormDeadline(d.key)}>
                      <Text className={styles.deadlineText}>{d.label}</Text>
                    </Button>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={closeForm}><Text className={styles.cancelBtnText}>取消</Text></Button>
              <Button className={styles.submitBtn} onClick={() => {
                if (!formType) { Taro.showToast({ title: '请选择问题类型', icon: 'none' }); return; }
                if (!formLocation.trim()) { Taro.showToast({ title: '请填写具体位置', icon: 'none' }); return; }
                if (!formDesc.trim()) { Taro.showToast({ title: '请填写问题描述', icon: 'none' }); return; }
                if (!formRectifier) { Taro.showToast({ title: '请指派整改人', icon: 'none' }); return; }
                doSubmit();
              }}><Text className={styles.submitBtnText}>提交上报</Text></Button>
            </View>
          </View>
        </View>
      )}

      {showRectifyForm && selectedHazard && (
        <View className={styles.modalMask} onClick={() => setShowRectifyForm(false)}>
          <View className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>提交整改</Text>
              <View className={styles.modalClose} onClick={() => setShowRectifyForm(false)}><Text className={styles.modalCloseText}>×</Text></View>
            </View>
            <ScrollView scrollY className={styles.modalBody}>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>隐患: {selectedHazard.typeName} - {selectedHazard.location}</Text>
              </View>
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>整改说明</Text>
                <Textarea className={styles.formTextarea} placeholder="描述已完成的整改措施..." value={rectifyDesc} onInput={(e) => setRectifyDesc(e.detail.value)} maxlength={300} />
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>整改照片（最多6张）</Text>
                <View className={styles.photoList}>
                  {rectifyPhotos.map((p, idx) => (
                    <View key={idx} className={styles.photoItem}>
                      <Image className={styles.photoImg} src={p} mode="aspectFill" />
                      <View className={styles.photoDelete} onClick={() => deletePhoto(idx, setRectifyPhotos)}><Text>×</Text></View>
                    </View>
                  ))}
                  {rectifyPhotos.length < 6 && (
                    <View className={styles.photoAdd} onClick={handleAddPhoto(setRectifyPhotos, 6)}>
                      <Text className={styles.photoAddIcon}>＋</Text><Text className={styles.photoAddText}>拍照/相册</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={() => setShowRectifyForm(false)}><Text className={styles.cancelBtnText}>取消</Text></Button>
              <Button className={classnames(styles.submitBtn, styles.rectifySubmitBtn)} onClick={doSubmitRectify}><Text className={styles.submitBtnText}>提交整改</Text></Button>
            </View>
          </View>
        </View>
      )}

      {showRecheckForm && selectedHazard && (
        <View className={styles.modalMask} onClick={() => setShowRecheckForm(false)}>
          <View className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>复查确认</Text>
              <View className={styles.modalClose} onClick={() => setShowRecheckForm(false)}><Text className={styles.modalCloseText}>×</Text></View>
            </View>
            <ScrollView scrollY className={styles.modalBody}>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>隐患: {selectedHazard.typeName} - {selectedHazard.location}</Text>
              </View>
              {selectedHazard.rectification && (
                <View className={styles.formGroup}>
                  <Text className={styles.formLabel}>整改说明: {selectedHazard.rectification.description}</Text>
                </View>
              )}
              <View className={styles.formGroup}>
                <Text className={classnames(styles.formLabel, styles.formLabelRequired)}>复查结论</Text>
                <View className={styles.levelRow}>
                  <View className={classnames(styles.levelOption, !recheckPassed && styles.selected, styles.critical)} onClick={() => setRecheckPassed(false)}>
                    <Text className={styles.levelName}>不通过</Text>
                  </View>
                  <View className={classnames(styles.levelOption, recheckPassed && styles.selected, styles.minor)} onClick={() => setRecheckPassed(true)}>
                    <Text className={styles.levelName}>通过</Text>
                  </View>
                </View>
              </View>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>复查备注</Text>
                <Textarea className={styles.formTextarea} placeholder="输入复查意见..." value={recheckRemark} onInput={(e) => setRecheckRemark(e.detail.value)} maxlength={200} />
              </View>
            </ScrollView>
            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={() => setShowRecheckForm(false)}><Text className={styles.cancelBtnText}>取消</Text></Button>
              <Button className={classnames(styles.submitBtn, recheckPassed && styles.recheckPassBtn)} onClick={doSubmitRecheck}>
                <Text className={styles.submitBtnText}>{recheckPassed ? '确认通过' : '退回整改'}</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default HazardsPage;
