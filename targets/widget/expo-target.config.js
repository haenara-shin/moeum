/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'moeum-widget',
  icon: '../../assets/icon.png',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#5B4FE5',
  },
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.haenarashin.moeum'],
  },
};
