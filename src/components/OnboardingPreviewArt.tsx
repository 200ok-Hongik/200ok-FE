import Svg, { Path, Rect } from 'react-native-svg';

// Viewfinder chrome (corner brackets + AI highlight box) overlaid on top of
// the real product photo used on the onboarding hero.
export function OnboardingPreviewArt() {
  return (
    <Svg viewBox="0 0 375 812" width="100%" height="100%">
      {[
        { x: 108, y: 300, dx: 1, dy: 1 },
        { x: 268, y: 300, dx: -1, dy: 1 },
        { x: 108, y: 620, dx: 1, dy: -1 },
        { x: 268, y: 620, dx: -1, dy: -1 },
      ].map((c, i) => (
        <Path
          key={i}
          d={`M ${c.x} ${c.y + 26 * c.dy} L ${c.x} ${c.y} L ${c.x + 26 * c.dx} ${c.y}`}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      <Rect
        x="122"
        y="470"
        width="140"
        height="150"
        rx="18"
        fill="rgba(34,197,94,0.16)"
        stroke="rgba(34,197,94,0.55)"
        strokeWidth={1.5}
      />
    </Svg>
  );
}
