// 방금 촬영한 사진을 스캔 결과 화면들이 다시 쓰기 위한 메모리 저장소.
// 서버가 돌려주는 imageUrl보다 내가 찍은 원본을 먼저 보여주려는 용도이고, 앱을 새로고침하면 사라진다.
export type ScanPhoto = { uri: string; width?: number; height?: number };

const photos = new Map<number, ScanPhoto>();

export function setScanPhoto(scanId: number, photo: ScanPhoto) {
  photos.set(scanId, photo);
}

export function getScanPhoto(scanId: number | string | undefined): ScanPhoto | undefined {
  return scanId == null ? undefined : photos.get(Number(scanId));
}
