import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. */}
        <ScrollViewStyleReset />
        
        {/* Load Google Fonts directly for Web to avoid GitHub Pages asset path 404s */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
      </head>
      <body>{children}</body>
    </html>
  );
}
