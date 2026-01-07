"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Cloudflare Worker proxy URL - set this after deploying your worker
const WORKER_PROXY_URL = process.env.NEXT_PUBLIC_VNC_PROXY_URL || "";

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

  // If no proxy configured, show setup instructions
  if (!WORKER_PROXY_URL) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1a2e] text-white p-4">
        <h2 className="text-xl font-bold mb-4">VNC Proxy Not Configured</h2>
        <p className="text-gray-400 mb-2">Set NEXT_PUBLIC_VNC_PROXY_URL in your environment</p>
        <p className="text-gray-500 text-sm">Example: https://vnc-proxy.your-account.workers.dev</p>
        <a
          href={`${url.replace("https://", "http://")}/vnc.html${token ? `?token=${token}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        >
          Open VNC in New Tab (fallback)
        </a>
      </div>
    );
  }

  // Extract host from URL (e.g., "6080-xxx.proxy.daytona.works" from "https://6080-xxx.proxy.daytona.works")
  const daytonaHost = url.replace("https://", "").replace("http://", "").replace(/\/$/, "");

  // Build the proxied VNC URL with autoconnect
  // Worker URL format: https://worker.dev/{daytona-host}/vnc.html?token=xxx&autoconnect=true
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("autoconnect", "true");
  params.set("resize", "scale");
  const proxiedVncUrl = `${WORKER_PROXY_URL}/${daytonaHost}/vnc.html?${params.toString()}`;

  // Debug logging
  console.log("VNC Debug - Original URL:", url);
  console.log("VNC Debug - Daytona Host:", daytonaHost);
  console.log("VNC Debug - Proxied VNC URL:", proxiedVncUrl);

  // Simply iframe the proxied noVNC page - it will handle WebSocket connections automatically
  return (
    <iframe
      src={proxiedVncUrl}
      className="w-full h-screen border-0"
      allow="clipboard-read; clipboard-write; fullscreen"
    />
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
