export default defineAppConfig({
  pages: [
    'pages/tasks/index',
    'pages/scan/index',
    'pages/hazards/index',
    'pages/recheckLedger/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E5AA8',
    navigationBarTitleText: '高支模巡检',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#1E5AA8',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/tasks/index',
        text: '今日任务'
      },
      {
        pagePath: 'pages/scan/index',
        text: '扫码测点'
      },
      {
        pagePath: 'pages/hazards/index',
        text: '隐患上报'
      }
    ]
  }
})
