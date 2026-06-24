import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no" />
        {/* Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. */}
        <ScrollViewStyleReset />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Move App" />
        <link rel="apple-touch-icon" href="/move-app/apple-touch-icon.png" />
        
        {/* Android / General PWA Support */}
        <link rel="manifest" href="/move-app/manifest.json" />
        

        <style dangerouslySetInnerHTML={{ __html: `
          input:focus, textarea:focus, [contenteditable]:focus {
            outline: none !important;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
