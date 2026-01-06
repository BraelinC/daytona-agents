"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VNCViewer() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const token = searchParams.get("token") || "";

  if (!url) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a2e] text-red-500">
        No VNC URL provided
      </div>
    );
  }

  // Build WebSocket URL from HTTP URL
  const wsBase = url.replace("https://", "wss://").replace("http://", "ws://").replace(/\/$/, "");
  const wsUrl = `${wsBase}/websockify${token ? `?token=${token}` : ""}`;

  // Debug logging
  console.log("VNC Debug - Input URL:", url);
  console.log("VNC Debug - Token:", token);
  console.log("VNC Debug - WS Base:", wsBase);
  console.log("VNC Debug - Final WS URL:", wsUrl);

  return (
    <div className="h-screen bg-[#1a1a2e]">
      <div
        id="status"
        className="fixed top-2.5 left-2.5 bg-black/70 text-green-500 px-4 py-2 rounded font-mono text-sm z-50"
      >
        Connecting... (check console for debug)
      </div>
      {/* Debug display */}
      <div className="fixed bottom-2.5 left-2.5 bg-black/70 text-yellow-400 px-4 py-2 rounded font-mono text-xs z-50 max-w-md break-all">
        URL: {url}<br/>
        WS: {wsUrl}
      </div>
      <div id="screen" className="w-full h-full" />

      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: `
            import RFB from 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js';

            const status = document.getElementById('status');
            const wsUrl = '${wsUrl}';

            try {
              const rfb = new RFB(
                document.getElementById('screen'),
                wsUrl,
                { credentials: { password: '' } }
              );

              rfb.scaleViewport = true;
              rfb.resizeSession = true;

              rfb.addEventListener('connect', () => {
                status.textContent = 'Connected!';
                setTimeout(() => status.style.display = 'none', 2000);
              });

              rfb.addEventListener('disconnect', (e) => {
                status.textContent = 'Disconnected' + (e.detail.clean ? '' : ' (error)');
                status.style.color = '#f55';
                status.style.display = 'block';
              });

              rfb.addEventListener('securityfailure', (e) => {
                status.textContent = 'Security error: ' + e.detail.reason;
                status.style.color = '#f55';
              });

            } catch (err) {
              status.textContent = 'Error: ' + err.message;
              status.style.color = '#f55';
            }
          `,
        }}
      />
    </div>
  );
}

export default function VNCPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#1a1a2e] text-gray-400">
          Loading VNC...
        </div>
      }
    >
      <VNCViewer />
    </Suspense>
  );
}
