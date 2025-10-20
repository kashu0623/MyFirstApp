import React, { useEffect,useState } from 'react';
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
  // 2. 초기화 상태와 버튼 활성화 상태를 관리할 state 추가
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
    useEffect(() => {
      const initHealthConnect = async () => {
        console.log('useEffect: Attempting to initialize Health Connect...');
        setIsInitializing(true);
        try {
          const initialized = await initialize();
          if (!initialized) {
            console.error('Health Connect initialization failed (useEffect)');
            setIsInitialized(false);
          } else {
            console.log('Health Connect initialized successfully (useEffect)');
            setIsInitialized(true);
          }
        } catch (initError) {
          console.error('Health Connect initialization error (useEffect)', initError);
          setIsInitialized(false);
        } finally {
          console.log('useEffect: Setting isInitializing to false.'); // <-- 로그 추가
          setIsInitializing(false); // 초기화 완료 (성공/실패 무관)
        }
      };
      initHealthConnect();
    }, []);
  
  const requestHealthDataPermission = async () => {
    console.log(`Button pressed: isInitialized=${isInitialized}, isInitializing=${isInitializing}`); // <-- 로그 추가

    // 초기화 안됐거나 진행중이면 혹시 모르니 한번 더 방지
    if (!isInitialized || isInitializing) {
        console.warn('Permission request blocked because initialization is not complete.');
        return;
    }
    const sdkStatus = await getSdkStatus();
    console.log('SDK Status:', sdkStatus); // 로그 추가
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
    console.log('Requesting permissions:', permissions); // 로그 추가

    try {
      // requestPermission 함수에 permissions 배열을 전달할 때 'as any'를 추가합니다.
      const granted = await requestPermission(permissions as any); // <--- 수정된 부분
      console.log('Permissions granted:', granted);
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
      console.error('Permission request failed:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      Alert.alert('오류', '권한을 요청하는 데 실패했습니다.');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Button
          title={isInitializing ? "초기화 중..." : "건강 데이터 권한 요청하기"}
          // 4. isInitialized가 true이고, isInitializing이 false일 때만 버튼 활성화
          disabled={!isInitialized || isInitializing}
          onPress={requestHealthDataPermission}
        />
        {!isInitialized && !isInitializing && (
           // 5. 초기화 실패 시 사용자 안내 추가 (선택 사항)
           <Text style={{marginTop: 10, color: 'red'}}>Health Connect 초기화 실패. 앱 재시작 또는 Health Connect 앱 확인이 필요합니다.</Text>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;