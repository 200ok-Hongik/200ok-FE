import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SSOK" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <ScrollViewStyleReset />
        {/* 앱처럼 쓰는 화면이라 핀치 확대와 가장자리 끌림(바운스)을 막는다. */}
        <style dangerouslySetInnerHTML={{ __html: 'html,body{overscroll-behavior:none;touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;}video::-webkit-media-controls,video::-webkit-media-controls-enclosure,video::-webkit-media-controls-panel,video::-webkit-media-controls-start-playback-button,video::-webkit-media-controls-overlay-play-button{display:none!important;opacity:0!important;pointer-events:none!important;-webkit-appearance:none;}' }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "['gesturestart','gesturechange','gestureend'].forEach(function(t){document.addEventListener(t,function(e){e.preventDefault();},{passive:false});});",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
