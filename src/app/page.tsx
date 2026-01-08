"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

// SSH credentials state type
interface SshCredentials {
  sshCommand: string;
  expiresAt: string;
}

const VNC_PROXY_URL = process.env.NEXT_PUBLIC_VNC_PROXY_URL || "";

// Local VNC URL (your home PC via Cloudflare tunnel)
const LOCAL_VNC_URL = "https://vnc.braelin.uk/vnc.html?autoconnect=true&resize=scale";

// Project presets
const PROJECT_PRESETS = [
  { name: "Claude Code", cliTool: "claude-code", description: "Anthropic's Claude Code CLI" },
  { name: "OpenCode", cliTool: "opencode", description: "OpenCode with OpenRouter" },
];

// Build a proxied VNC URL
function getProxiedVncUrl(vncUrl: string, token?: string | null): string {
  const host = vncUrl.replace("https://", "").replace("http://", "").replace(/\/$/, "");
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("autoconnect", "true");
  params.set("resize", "scale");
  const wsPath = token ? `${host}/websockify?token=${token}` : `${host}/websockify`;
  params.set("path", wsPath);

  if (VNC_PROXY_URL) {
    return `${VNC_PROXY_URL}/${host}/vnc.html?${params.toString()}`;
  }
  return `${vncUrl}/vnc.html?${params.toString()}`;
}

export default function Home() {
  // Queries
  const orchestrators = useQuery(api.sandboxes.listOrchestrators);
  const workers = useQuery(api.sandboxes.listWorkers);

  // Actions
  const setupOrchestrator = useAction(api.orchestrator.setup);
  const stopSandbox = useAction(api.daytona.stopSandbox);
  const createSshAccess = useAction(api.ssh.createSshAccess);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string>("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());
  const [sshCredentials, setSshCredentials] = useState<Record<string, SshCredentials>>({});
  const [loadingSsh, setLoadingSsh] = useState<Set<string>>(new Set());
  const [copiedSsh, setCopiedSsh] = useState<string | null>(null);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Total slides = orchestrators + 1 (Local PC) + 1 (new project card)
  const totalSlides = (orchestrators?.length || 0) + 2;

  // Ensure currentIndex is valid when orchestrators change
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(Math.max(0, totalSlides - 1));
    }
  }, [totalSlides, currentIndex]);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  // Handle touch end - detect swipe
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < totalSlides - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < totalSlides - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalSlides]);

  // Get SSH credentials (reuses existing if not expired)
  const handleGetSsh = useCallback(async (sandboxId: string) => {
    // Check if we already have valid credentials for this sandbox
    const existing = sshCredentials[sandboxId];
    if (existing) {
      const expiresAt = new Date(existing.expiresAt).getTime();
      const now = Date.now();
      // If token expires in more than 1 hour, reuse it
      if (expiresAt - now > 60 * 60 * 1000) {
        console.log("[SSH] Reusing existing token for sandbox:", sandboxId);
        return; // Already have valid credentials displayed
      }
    }

    console.log("[SSH] Requesting new SSH token for sandbox:", sandboxId);
    setLoadingSsh(prev => new Set(prev).add(sandboxId));
    try {
      const result = await createSshAccess({ sandboxId });
      console.log("[SSH] Got credentials for sandbox:", sandboxId);
      setSshCredentials(prev => ({
        ...prev,
        [sandboxId]: { sshCommand: result.sshCommand, expiresAt: result.expiresAt }
      }));
    } catch (error) {
      console.error("[SSH] Failed for sandbox:", sandboxId, error);
      alert("Failed to get SSH: " + (error as Error).message);
    } finally {
      setLoadingSsh(prev => {
        const next = new Set(prev);
        next.delete(sandboxId);
        return next;
      });
    }
  }, [createSshAccess, sshCredentials]);

  // Copy SSH command
  const handleCopySsh = useCallback((sandboxId: string, sshCommand: string) => {
    navigator.clipboard.writeText(sshCommand);
    setCopiedSsh(sandboxId);
    setTimeout(() => setCopiedSsh(null), 2000);
  }, []);

  // Create new project
  const handleCreateProject = async () => {
    setIsSettingUp(true);
    setSetupError(null);
    setSetupStatus("Starting sandbox creation...");
    try {
      const preset = PROJECT_PRESETS[selectedPreset];
      setSetupStatus(`Creating ${preset.name} sandbox...`);
      const result = await setupOrchestrator({ cliTool: preset.cliTool });
      setSetupStatus(`Success! Sandbox ${result.sandboxId.slice(0, 8)} created`);
      // Navigate to the new project after a brief delay
      setTimeout(() => {
        setSetupStatus("");
      }, 2000);
    } catch (error) {
      const errMsg = (error as Error).message;
      setSetupError(errMsg);
      setSetupStatus("");
      console.error("Setup failed:", error);
    } finally {
      setIsSettingUp(false);
    }
  };

  // Stop sandbox
  const handleStop = async (sandboxId: string, convexId: Id<"sandboxes">) => {
    setStoppingIds(prev => new Set(prev).add(convexId));
    try {
      await stopSandbox({ sandboxId, convexId });
    } catch (error) {
      alert("Failed to stop: " + (error as Error).message);
    } finally {
      setStoppingIds(prev => {
        const next = new Set(prev);
        next.delete(convexId);
        return next;
      });
    }
  };

  const projectCount = orchestrators?.length || 0;

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold text-[#f0f6fc]">Daytona Agents</h1>
        <span className="text-sm text-[#8b949e]">
          {projectCount} project{projectCount !== 1 ? "s" : ""} • {workers?.length || 0} worker{(workers?.length || 0) !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 py-3 bg-[#161b22] border-b border-[#30363d] shrink-0">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentIndex ? "bg-[#58a6ff]" : "bg-[#30363d] hover:bg-[#484f58]"
            }`}
            aria-label={i < projectCount ? `Project ${i + 1}` : "New Project"}
          />
        ))}
      </div>

      {/* Swipeable Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides */}
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {/* Existing Projects */}
          {orchestrators?.map((orch, index) => (
            <div key={orch._id} className="w-full h-full shrink-0 flex flex-col">
              {/* Project Header */}
              <div className="px-4 py-3 bg-[#21262d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#1f6feb] text-white text-xs rounded font-medium">
                    PROJECT {index + 1}
                  </span>
                  <span className="text-[#58a6ff] text-sm font-mono">
                    {orch.sandboxId.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGetSsh(orch.sandboxId)}
                    disabled={loadingSsh.has(orch.sandboxId)}
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50
                               text-[#58a6ff] text-xs font-semibold rounded border border-[#30363d]"
                  >
                    {loadingSsh.has(orch.sandboxId) ? "..." : "SSH"}
                  </button>
                  <a
                    href={getProxiedVncUrl(orch.vncUrl, orch.vncToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d]
                               text-[#8b949e] text-xs font-semibold rounded border border-[#30363d]"
                  >
                    Fullscreen
                  </a>
                  <button
                    onClick={() => handleStop(orch.sandboxId, orch._id)}
                    disabled={stoppingIds.has(orch._id)}
                    className="px-3 py-1.5 bg-[#da3633] hover:bg-[#f85149] disabled:opacity-50
                               text-white text-xs font-semibold rounded"
                  >
                    {stoppingIds.has(orch._id) ? "..." : "Stop"}
                  </button>
                </div>
              </div>

              {/* SSH Credentials */}
              {sshCredentials[orch.sandboxId] && (
                <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8b949e]">SSH for {orch.sandboxId.slice(0, 12)}:</span>
                    <code className="flex-1 text-xs text-[#7ee787] font-mono bg-[#161b22] px-2 py-1 rounded truncate">
                      {sshCredentials[orch.sandboxId].sshCommand}
                    </code>
                    <button
                      onClick={() => handleCopySsh(orch.sandboxId, sshCredentials[orch.sandboxId].sshCommand)}
                      className="px-2 py-1 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded"
                    >
                      {copiedSsh === orch.sandboxId ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* VNC Frame */}
              <div className="flex-1 min-h-0">
                <iframe
                  src={`/vnc?url=${encodeURIComponent(orch.vncUrl)}&token=${encodeURIComponent(orch.vncToken || "")}`}
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              </div>
            </div>
          ))}

          {/* Local PC Card */}
          <div className="w-full h-full shrink-0 flex flex-col">
            {/* Local PC Header */}
            <div className="px-4 py-3 bg-[#21262d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#238636] text-white text-xs rounded font-medium">
                  LOCAL PC
                </span>
                <span className="text-[#7ee787] text-sm font-mono">
                  vnc.braelin.uk
                </span>
              </div>
              <a
                href={LOCAL_VNC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d]
                           text-[#8b949e] text-xs font-semibold rounded border border-[#30363d]"
              >
                Fullscreen
              </a>
            </div>

            {/* Local VNC Frame */}
            <div className="flex-1 min-h-0">
              <iframe
                src={LOCAL_VNC_URL}
                className="w-full h-full border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          </div>

          {/* New Project Card */}
          <div className="w-full h-full shrink-0 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#21262d] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#f0f6fc] mb-2">New Project</h2>
                <p className="text-sm text-[#8b949e]">Create a new Daytona sandbox with AI coding assistant</p>
              </div>

              {/* Preset Selection */}
              <div className="space-y-3">
                {PROJECT_PRESETS.map((preset, i) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedPreset(i)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      selectedPreset === i
                        ? "border-[#58a6ff] bg-[#161b22]"
                        : "border-[#30363d] bg-[#0d1117] hover:border-[#484f58]"
                    }`}
                  >
                    <div className="font-medium text-[#f0f6fc]">{preset.name}</div>
                    <div className="text-xs text-[#8b949e] mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateProject}
                disabled={isSettingUp}
                className="w-full py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                           text-white font-semibold rounded-lg transition-colors"
              >
                {isSettingUp ? "Creating Project..." : "Create Project"}
              </button>

              {/* Status Log */}
              {setupStatus && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-[#58a6ff] border-t-transparent rounded-full" />
                    <p className="text-sm text-[#58a6ff]">{setupStatus}</p>
                  </div>
                  <p className="text-xs text-[#8b949e] mt-2">
                    This may take 1-2 minutes (installing TMUX, configuring SSH, starting CLI)
                  </p>
                </div>
              )}

              {/* Error Display */}
              {setupError && (
                <div className="bg-[#3d1418] border border-[#f85149] rounded-lg p-4">
                  <p className="text-sm text-[#f85149] font-medium">Setup Failed</p>
                  <p className="text-xs text-[#f0f6fc] mt-1 font-mono break-all">{setupError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left/Right Navigation Arrows (Desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10
                       bg-[#21262d] hover:bg-[#30363d] rounded-full items-center justify-center
                       border border-[#30363d] text-[#c9d1d9]"
            aria-label="Previous project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {currentIndex < totalSlides - 1 && (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10
                       bg-[#21262d] hover:bg-[#30363d] rounded-full items-center justify-center
                       border border-[#30363d] text-[#c9d1d9]"
            aria-label="Next project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom hint for mobile */}
      <div className="md:hidden px-4 py-2 bg-[#161b22] border-t border-[#30363d] text-center shrink-0">
        <span className="text-xs text-[#6e7681]">Swipe left/right to switch projects</span>
      </div>
    </div>
  );
}
