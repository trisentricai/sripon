import 'package:flutter_test/flutter_test.dart';

import 'package:sripon/config/env.dart';

void main() {
  group('AppEnv', () {
    test('apiBaseUrl defaults to the Android emulator host loopback', () {
      // Without --dart-define the app targets the local backend.
      expect(AppEnv.apiBaseUrl, 'http://10.0.2.2:8000/api/v1');
    });

    test('usesLocalDefault is true when no backend URL was injected', () {
      expect(AppEnv.usesLocalDefault, isTrue);
    });

    test('firebaseProjectId defaults to empty (no hard-coded value)', () {
      expect(AppEnv.firebaseProjectId, isEmpty);
    });

    test('feature flags default sensibly', () {
      expect(AppEnv.enableGoogleSignIn, isTrue);
      expect(AppEnv.enablePhoneAuth, isFalse);
    });
  });
}