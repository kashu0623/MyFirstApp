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
  const [initError, setInitError] = useState<string | null>(null);
  
  useEffect(() => {
    const initHealthConnect = async () => {
      console.log('useEffect: Attempting to initialize Health Connect...');
      setIsInitializing(true);
      setInitError(null);
      
      try {
        // 초기화 전에 SDK 상태 먼저 확인
        const sdkStatus = await getSdkStatus();
        console.log('SDK Status during init:', sdkStatus);
        
        if (sdkStatus < 3) {
          throw new Error('Health Connect SDK not available. Please install Health Connect app from Play Store.');
        }
        
        const initialized = await initialize();
        if (!initialized) {
          throw new Error('Health Connect initialization returned false');
        }
        
        console.log('Health Connect initialized successfully (useEffect)');
        setIsInitialized(true);
        
        // 초기화 완료 후 잠시 대기하여 네이티브 객체가 완전히 준비되도록 함
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error('Health Connect initialization error (useEffect)', errorMessage);
        setInitError(errorMessage);
        setIsInitialized(false);
      } finally {
        console.log('useEffect: Setting isInitializing to false.');
        setIsInitializing(false);
      }
    };
    
    initHealthConnect();
  }, []);
  
  const requestHealthDataPermission = async () => {
    console.log(`Button pressed: isInitialized=${isInitialized}, isInitializing=${isInitializing}`);

    // 초기화 안됐거나 진행중이면 혹시 모르니 한번 더 방지
    if (!isInitialized || isInitializing) {
        console.warn('Permission request blocked because initialization is not complete.');
        Alert.alert('알림', 'Health Connect 초기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    try {
      // 권한 요청 전에 다시 한번 SDK 상태 확인
      const sdkStatus = await getSdkStatus();
      console.log('SDK Status before permission request:', sdkStatus);
      
      if (sdkStatus < 3) {
        Alert.alert('오류', '플레이 스토어에서 Health Connect 앱을 먼저 설치해주세요.');
        return;
      }

      // 권한 요청 전에 다시 한번 초기화 상태 확인
      const recheckInitialized = await initialize();
      if (!recheckInitialized) {
        Alert.alert('오류', 'Health Connect 재초기화에 실패했습니다. 앱을 재시작해주세요.');
        return;
      }

      // 수정된 타입을 사용합니다.
      const permissions: HealthReadPermission[] = [
        {accessType: 'read', recordType: 'HeartRate'},
        {accessType: 'read', recordType: 'HeartRateVariabilityRmssd'},
        {accessType: 'read', recordType: 'SleepSession'},
      ];
      console.log('Requesting permissions:', permissions);

      // requestPermission 함수에 permissions 배열을 전달할 때 'as any'를 추가합니다.
      const granted = await requestPermission(permissions as any);
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
        
        // 특정 에러 타입에 따른 사용자 친화적 메시지
        if (error.message.includes('UninitializedPropertyAccessException')) {
          Alert.alert('오류', 'Health Connect가 완전히 초기화되지 않았습니다. 앱을 재시작해주세요.');
        } else if (error.message.includes('permission')) {
          Alert.alert('오류', '권한 요청 중 문제가 발생했습니다. Health Connect 앱을 확인해주세요.');
        } else {
          Alert.alert('오류', `권한을 요청하는 데 실패했습니다: ${error.message}`);
        }
      } else {
        Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
        <Button
          title={isInitializing ? "초기화 중..." : "건강 데이터 권한 요청하기"}
          // 4. isInitialized가 true이고, isInitializing이 false일 때만 버튼 활성화
          disabled={!isInitialized || isInitializing}
          onPress={requestHealthDataPermission}
        />
        
        {/* 초기화 상태 표시 */}
        {isInitializing && (
          <Text style={{marginTop: 10, color: 'blue'}}>
            Health Connect 초기화 중...
          </Text>
        )}
        
        {/* 초기화 실패 시 사용자 안내 */}
        {!isInitialized && !isInitializing && initError && (
          <View style={{marginTop: 20, padding: 15, backgroundColor: '#ffebee', borderRadius: 8}}>
            <Text style={{color: 'red', fontWeight: 'bold', marginBottom: 5}}>
              초기화 실패
            </Text>
            <Text style={{color: 'red', fontSize: 12}}>
              {initError}
            </Text>
            <Text style={{color: 'red', fontSize: 12, marginTop: 5}}>
              해결 방법: Health Connect 앱을 설치하고 앱을 재시작해주세요.
            </Text>
          </View>
        )}
        
        {/* 초기화 성공 시 안내 */}
        {isInitialized && !isInitializing && (
          <Text style={{marginTop: 10, color: 'green'}}>
            ✓ Health Connect 초기화 완료
          </Text>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;