import React, { useEffect } from 'react';
import {Text, StyleSheet, View, Button, Alert} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  // 라이브러리에서 실제 타입을 내보낸다면 그것을 사용하는 것이 가장 좋습니다.
  // 예: import { ReadPermission } from 'react-native-health-connect';
} from 'react-native-health-connect';

// 타입을 더 구체적으로 정의합니다: accessType은 오직 'read'만 가능
// 가능하다면 라이브러리에서 제공하는 정확한 타입을 사용하세요.
type HealthReadPermission = {
  accessType: 'read'; // 'read' | 'write' 에서 'read'로 변경
  recordType: 'HeartRate' | 'HeartRateVariabilityRmssd' | string; // 구체적으로 명시하거나 string 유지
};


const App = () => {
  useEffect(() => {
    const initHealthConnect = async () => {
      try {
        const isInitialized = await initialize(); // 앱 시작 시 초기화 시도
        if (!isInitialized) {
          // 초기화 실패 시 사용자에게 알리거나 로그를 남길 수 있습니다.
          console.warn('Health Connect 초기화 실패 (useEffect)');
          // Alert.alert('오류', 'Health Connect를 초기화할 수 없습니다. 앱을 재시작해주세요.');
        } else {
          console.log('Health Connect initialized (useEffect):', isInitialized);
        }
      } catch (initError) {
        console.error('Health Connect 초기화 중 오류 (useEffect)', initError);
        // Alert.alert('오류', 'Health Connect 초기화 중 오류가 발생했습니다.');
      }
    };
    initHealthConnect(); // 위에서 정의한 비동기 함수를 호출합니다.
  }, []); // 빈 배열 []은 이 useEffect가 컴포넌트 마운트 시 한 번만 실행되도록 합니다.
  const requestHealthDataPermission = async () => {
    const sdkStatus = await getSdkStatus();
    if (sdkStatus < 3) {
      Alert.alert('오류', '플레이 스토어에서 Health Connect 앱을 먼저 설치해주세요.');
      return;
    }

    // 수정된 타입을 사용합니다.
    const permissions: HealthReadPermission[] = [ // <--- 수정된 타입을 여기에 적용
      {accessType: 'read', recordType: 'HeartRate'},
      {accessType: 'read', recordType: 'HeartRateVariabilityRmssd'},
      {accessType: 'read', recordType: 'SleepSession'},
    ];

    try {
      // requestPermission 함수에 permissions 배열을 전달할 때 'as any'를 추가합니다.
      const granted = await requestPermission(permissions as any); // <--- 수정된 부분
      console.log('권한 허용됨:', granted);
      // 기존 Alert.alert('성공', ...) 줄을 아래 코드로 대체합니다.
      const sleepGranted = granted.some(p => p.recordType === 'SleepSession' && p.accessType === 'read');

      if (sleepGranted) {
        Alert.alert('성공', '수면 데이터 읽기 권한이 허용되었습니다!');
        // 여기에 실제 데이터를 읽어오는 함수 호출 로직을 추가할 수 있습니다.
        // 예: readSleepData();
      } else {
        Alert.alert('알림', '수면 데이터 읽기 권한이 필요합니다.');
      }
    } catch (error) {
      console.error('권한 요청 실패', error);
      Alert.alert('오류', '권한을 요청하는 데 실패했습니다.');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Button
          title="건강 데이터 권한 요청하기"
          onPress={requestHealthDataPermission}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;