/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'moeum-widget',
  icon: '../../assets/icon.png',
  deploymentTarget: '16.0',
  colors: {
    $accent: '#5B4FE5',
    $widgetBackground: { color: '#FAFAF7', darkColor: '#0B0B0C' },
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.haenarashin.moeum'],
  },
};
