import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML template for Expo Router Web.
 * Configured specifically to lock viewport scale and prevent iOS Safari auto-zoom on inputs.
 * In Expo SDK 58, useServerDocumentContext is required to inject headNodes (styles/fonts)
 * and bodyNodes (client hydration script bundles).
 */
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="de" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Lock touch action and size adjustment to prevent iOS pinch/auto zoom */
              html, body {
                touch-action: pan-x pan-y;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
                overscroll-behavior-y: none;
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
              }

              /* iOS Safari auto-zooms whenever an input has font-size < 16px. Enforcing 16px prevents zoom-in */
              input, select, textarea {
                font-size: 16px !important;
                touch-action: pan-x pan-y;
              }

              /* Smooth rendering */
              #root {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
              }
            `,
          }}
        />

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
