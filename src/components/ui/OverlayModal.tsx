import { Modal, Platform, type ModalProps } from 'react-native';

export const WEB_FRAME_ID = 'ssok-app-frame';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createPortal = Platform.OS === 'web' ? (require('react-dom') as typeof import('react-dom')).createPortal : null;

type Props = {
  visible: boolean;
  onRequestClose?: () => void;
  animationType?: ModalProps['animationType'];
  children: React.ReactNode;
};

// On native this is a plain full-screen Modal. On web, RN's Modal portals to
// document.body and ignores our centered phone-frame wrapper, so instead we
// portal directly into the frame element to keep overlays inside it.
export function OverlayModal({ visible, onRequestClose, animationType = 'none', children }: Props) {
  if (Platform.OS === 'web') {
    if (!visible || !createPortal) return null;
    const target = typeof document !== 'undefined' ? document.getElementById(WEB_FRAME_ID) : null;
    if (!target) return null;
    return createPortal(children, target);
  }

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
