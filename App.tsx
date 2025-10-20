import React, { useEffect, useState, useRef } from 'react';
import {Text, StyleSheet, View, Button, Alert, AppState, AppStateStatus} from 'react-native';
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
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const appState = useRef(AppState.currentState);
  const permissionRequestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 앱 생명주기 이벤트 처리
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed from', appState.current, 'to', nextAppState);
      
      // 앱이 포그라운드로 돌아올 때 권한 요청이 진행 중이었다면 처리
      if (appState.current === 'background' && nextAppState === 'active' && isRequestingPermission) {
        console.log('App returned from background during permission request');
        
        // 권한 요청 타임아웃 정리
        if (permissionRequestTimeout.current) {
          clearTimeout(permissionRequestTimeout.current);
          permissionRequestTimeout.current = null;
        }
        
        // 잠시 대기 후 권한 요청 상태 해제
        setTimeout(() => {
          setIsRequestingPermission(false);
          console.log('Permission request state cleared');
        }, 1000);
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      if (permissionRequestTimeout.current) {
        clearTimeout(permissionRequestTimeout.current);
      }
    };
  }, [isRequestingPermission]);

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
        await new Promise<void>(resolve => setTimeout(resolve, 1000)); // 대기 시간 증가
        
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
    console.log(`Button pressed: isInitialized=${isInitialized}, isInitializing=${isInitializing}, isRequestingPermission=${isRequestingPermission}`);

    // 초기화 안됐거나 진행중이거나 이미 권한 요청 중이면 방지
    if (!isInitialized || isInitializing || isRequestingPermission) {
        console.warn('Permission request blocked because initialization is not complete or already requesting.');
        Alert.alert('알림', 'Health Connect 초기화가 완료되지 않았거나 이미 권한 요청 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    setIsRequestingPermission(true);
    
    // 권한 요청 타임아웃 설정 (30초)
    permissionRequestTimeout.current = setTimeout(() => {
      console.log('Permission request timeout');
      setIsRequestingPermission(false);
      Alert.alert('시간 초과', '권한 요청 시간이 초과되었습니다. 다시 시도해주세요.');
    }, 30000);

    try {
      // SDK 상태 확인
      const sdkStatus = await getSdkStatus();
      console.log('SDK Status before permission request:', sdkStatus);
      
      if (sdkStatus < 3) {
        Alert.alert('오류', '플레이 스토어에서 Health Connect 앱을 먼저 설치해주세요.');
        return;
      }

      // 라이브러리 내부 문제를 우회하기 위한 다중 초기화 시도
      let initSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Initialization attempt ${attempt}/3`);
        
        try {
          const initialized = await initialize();
          if (initialized) {
            console.log(`Initialization successful on attempt ${attempt}`);
            initSuccess = true;
            break;
          }
        } catch (initError) {
          console.warn(`Initialization attempt ${attempt} failed:`, initError);
        }
        
        // 각 시도 사이에 대기
        if (attempt < 3) {
          await new Promise<void>(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!initSuccess) {
        throw new Error('Failed to initialize Health Connect after 3 attempts');
      }

      // 추가 대기 시간으로 네이티브 객체 안정화
      await new Promise<void>(resolve => setTimeout(resolve, 2000));

      // 수정된 타입을 사용합니다.
      const permissions: HealthReadPermission[] = [
        {accessType: 'read', recordType: 'HeartRate'},
        {accessType: 'read', recordType: 'HeartRateVariabilityRmssd'},
        {accessType: 'read', recordType: 'SleepSession'},
      ];
      console.log('Requesting permissions:', permissions);

      // 라이브러리 내부 문제를 우회하기 위한 권한 요청 시도
      let granted: any = null;
      let permissionSuccess = false;
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        console.log(`Permission request attempt ${attempt}/2`);
        
        try {
          // requestPermission 함수에 permissions 배열을 전달할 때 'as any'를 추가합니다.
          granted = await requestPermission(permissions as any);
          console.log('Permissions granted:', granted);
          permissionSuccess = true;
          break;
        } catch (permissionError) {
          console.warn(`Permission request attempt ${attempt} failed:`, permissionError);
          
          if (attempt < 2) {
            // 재시도 전에 다시 초기화
            console.log('Re-initializing before retry...');
            await initialize();
            await new Promise<void>(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!permissionSuccess) {
        throw new Error('Failed to request permissions after 2 attempts');
      }
      
      // 타임아웃 정리
      if (permissionRequestTimeout.current) {
        clearTimeout(permissionRequestTimeout.current);
        permissionRequestTimeout.current = null;
      }
      
      setIsRequestingPermission(false);
      
      // 기존 Alert.alert('성공', ...) 줄을 아래 코드로 대체합니다.
      const sleepGranted = granted.some((p: any) => p.recordType === 'SleepSession' && p.accessType === 'read');

      if (sleepGranted) {
        Alert.alert('성공', '수면 데이터 읽기 권한이 허용되었습니다!');
        // 여기에 실제 데이터를 읽어오는 함수 호출 로직을 추가할 수 있습니다.
        // 예: readSleepData();
      } else {
        Alert.alert('알림', '수면 데이터 읽기 권한이 필요합니다.');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      
      // 타임아웃 정리
      if (permissionRequestTimeout.current) {
        clearTimeout(permissionRequestTimeout.current);
        permissionRequestTimeout.current = null;
      }
      
      setIsRequestingPermission(false);
      
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // 특정 에러 타입에 따른 사용자 친화적 메시지
        if (error.message.includes('UninitializedPropertyAccessException')) {
          Alert.alert(
            '라이브러리 오류', 
            'react-native-health-connect 라이브러리에 알려진 문제가 있습니다.\n\n' +
            '해결 방법:\n' +
            '1. Health Connect 앱을 최신 버전으로 업데이트\n' +
            '2. 앱을 완전히 재시작\n' +
            '3. 다른 Health Connect 라이브러리 사용 고려'
          );
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
          title={
            isInitializing 
              ? "초기화 중..." 
              : isRequestingPermission 
                ? "권한 요청 중..." 
                : "건강 데이터 권한 요청하기"
          }
          // 4. isInitialized가 true이고, isInitializing이 false이고, 권한 요청 중이 아닐 때만 버튼 활성화
          disabled={!isInitialized || isInitializing || isRequestingPermission}
          onPress={requestHealthDataPermission}
        />
        
        {/* 초기화 상태 표시 */}
        {isInitializing && (
          <Text style={{marginTop: 10, color: 'blue'}}>
            Health Connect 초기화 중...
          </Text>
        )}
        
        {/* 권한 요청 상태 표시 */}
        {isRequestingPermission && (
          <Text style={{marginTop: 10, color: 'orange'}}>
            권한 요청 중... Health Connect 화면에서 허용/거부를 선택해주세요.
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