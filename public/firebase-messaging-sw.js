// FCM 웹 푸시용 서비스 워커. 앱이 닫혀 있거나 백그라운드일 때 오는 알림을 받는다.
// onBackgroundMessage를 따로 두지 않는다: Firebase가 notification 알림을 직접 띄우므로,
// 여기서 showNotification을 또 부르면 같은 알림이 두 번 뜬다.
// 서비스 워커는 환경 변수를 읽을 수 없어서, 등록할 때 설정값을 주소 뒤에 붙여 넘긴다.
importScripts('/firebase-sdk/firebase-app-compat.js');
importScripts('/firebase-sdk/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

firebase.messaging();
