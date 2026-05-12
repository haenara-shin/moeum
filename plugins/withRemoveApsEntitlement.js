/**
 * 모음(Moeum) — Local-only notifications.
 *
 * expo-notifications plugin이 자동으로 추가하는 `aps-environment` entitlement를
 * 빌드 후 entitlements.plist에서 제거한다. 모음은 APNs 원격 푸시를 사용하지 않고
 * scheduleNotificationAsync() 기반 로컬 알림만 사용하기 때문이다.
 *
 * 효과:
 * - Apple Push Notification capability 미사용 명시
 * - APNs Auth Key 없이도 internal TestFlight 노출 보장
 * - 앱스토어 심사 시 "사용하지 않는 capability" 의문 회피
 */
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withRemoveApsEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && 'aps-environment' in cfg.modResults) {
      delete cfg.modResults['aps-environment'];
    }
    return cfg;
  });
};
