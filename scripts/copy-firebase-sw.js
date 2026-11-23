// 푸시 알림 서비스 워커가 쓰는 Firebase 스크립트를 설치된 firebase 패키지에서 public/으로 복사한다.
// 외부 CDN 주소에 기대지 않고, 앱에 들어 있는 firebase 버전과 항상 같은 버전을 쓰기 위해서다.
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', 'firebase');
const target = path.join(__dirname, '..', 'public', 'firebase-sdk');

if (!fs.existsSync(source)) process.exit(0);
fs.mkdirSync(target, { recursive: true });
for (const file of ['firebase-app-compat.js', 'firebase-messaging-compat.js']) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}
