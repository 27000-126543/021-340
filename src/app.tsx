import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import './app.scss';
import { useAppStore } from '@/store';

function App(props) {
  const initStore = useAppStore((s) => s.initStore);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);

  useEffect(() => {
    initStore();
  }, [initStore]);

  useDidShow(() => {
    loadFromStorage();
    console.log('[App] 页面显示，重新加载本地存储数据');
  });

  useDidHide(() => {});

  return props.children;
}

export default App;
