"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

const VNC_PROXY_URL = process.env.NEXT_PUBLIC_VNC_PROXY_URL || "";

// Build a proxied VNC URL
function getProxiedVncUrl(vncUrl: string, token?: string | null): string {
  const host = vncUrl.replace("https://", "").replace("http://", "").replace(/\/$/, "");
  const tokenParam = token ? `?token=${token}` : "";

  if (VNC_PROXY_URL) {
    return `${VNC_PROXY_URL}/${host}/vnc.html${tokenParam}`;
  }
  // Fallback to direct URL (will likely fail due to CORS/mixed content)
  return `${vncUrl}/vnc.html${tokenParam}`;
}

export default function Home() {
  // Queries
  const orchestrator = useQuery(api.sandboxes.getOrchestrator);
  const workers = useQuery(api.sandboxes.listWorkers);

  // Actions
  const setupOrchestrator = useAction(api.orchestrator.setup);
  const sendPrompt = useAction(api.orchestrator.sendPrompt);
  const createWorker = useAction(api.workers.create);
  const stopSandbox = useAction(api.daytona.stopSandbox);

  // State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isCreatingWorker, setIsCreatingWorker] = useState(false);
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());

  const handleSetupOrchestrator = async () => {
    setIsSettingUp(true);
    try {
      await setupOrchestrator({});
    } catch (error) {
      console.error("Failed to setup orchestrator:", error);
      alert("Failed to setup: " + (error as Error).message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;
    setIsSendingPrompt(true);
    try {
      await sendPrompt({ prompt });
      setPrompt("");
    } catch (error) {
      console.error("Failed to send prompt:", error);
      alert("Failed to send: " + (error as Error).message);
    } finally {
      setIsSendingPrompt(false);
    }
  };

  const handleCreateWorker = async () => {
    setIsCreatingWorker(true);
    try {
      await createWorker({});
    } catch (error) {
      console.error("Failed to create worker:", error);
      alert("Failed to create: " + (error as Error).message);
    } finally {
      setIsCreatingWorker(false);
    }
  };

  const handleStop = async (sandboxId: string, convexId: Id<"sandboxes">) => {
    setStoppingIds((prev) => new Set(prev).add(convexId));
    try {
      await stopSandbox({ sandboxId, convexId });
    } catch (error) {
      console.error("Failed to stop sandbox:", error);
      alert("Failed to stop: " + (error as Error).message);
    } finally {
      setStoppingIds((prev) => {
        const next = new Set(prev);
        next.delete(convexId);
        return next;
      });
    }
  };

  const workerCount = workers?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="px-6 py-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#f0f6fc]">Daytona Agents</h1>
        <span className="text-sm text-[#8b949e]">
          {orchestrator ? "1 orchestrator" : "No orchestrator"} + {workerCount} worker(s)
        </span>
      </header>

      {/* Prompt Input */}
      <div className="px-6 py-4 border-b border-[#30363d]">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
            placeholder="Clone BraelinC/myrepo and add a README..."
            disabled={!orchestrator || isSendingPrompt}
            className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-md
                       text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]
                       disabled:opacity-50"
          />
          <button
            onClick={handleSendPrompt}
            disabled={!orchestrator || !prompt.trim() || isSendingPrompt}
            className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                       text-white font-semibold rounded-md transition-colors"
          >
            {isSendingPrompt ? "Sending..." : "Send"}
          </button>
        </div>
        {!orchestrator && (
          <p className="mt-2 text-sm text-[#8b949e]">
            Initialize the orchestrator first to send prompts.
          </p>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Orchestrator Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f0f6fc]">
              Orchestrator
            </h2>
            {!orchestrator && (
              <button
                onClick={handleSetupOrchestrator}
                disabled={isSettingUp}
                className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#1f6feb]/50
                           text-white text-sm font-semibold rounded-md transition-colors"
              >
                {isSettingUp ? "Initializing..." : "Initialize Orchestrator"}
              </button>
            )}
          </div>

          {orchestrator ? (
            <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]">
              <div className="px-3 py-2 bg-[#21262d] flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#1f6feb] text-white text-xs rounded">
                    ORCHESTRATOR
                  </span>
                  <span className="text-[#58a6ff]">
                    {orchestrator.sandboxId.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getProxiedVncUrl(orchestrator.vncUrl, orchestrator.vncToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b949e] hover:text-[#c9d1d9]"
                  >
                    Open in Tab
                  </a>
                  <button
                    onClick={() =>
                      handleStop(orchestrator.sandboxId, orchestrator._id)
                    }
                    disabled={stoppingIds.has(orchestrator._id)}
                    className="px-3 py-1 bg-[#da3633] hover:bg-[#f85149] disabled:bg-[#da3633]/50
                               text-white text-xs font-semibold rounded"
                  >
                    {stoppingIds.has(orchestrator._id) ? "Stopping..." : "Stop"}
                  </button>
                </div>
              </div>
              <iframe
                src={`/vnc?url=${encodeURIComponent(orchestrator.vncUrl)}&token=${encodeURIComponent(orchestrator.vncToken || "")}`}
                className="w-full h-[400px] border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          ) : (
            <div className="border border-[#30363d] rounded-lg p-8 text-center bg-[#161b22]">
              <p className="text-[#8b949e]">
                {isSettingUp
                  ? "Setting up orchestrator... This may take a minute."
                  : "No orchestrator running. Click 'Initialize Orchestrator' to start."}
              </p>
            </div>
          )}
        </section>

        {/* Workers Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f0f6fc]">Workers</h2>
            <button
              onClick={handleCreateWorker}
              disabled={isCreatingWorker}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                         text-white text-sm font-semibold rounded-md transition-colors"
            >
              {isCreatingWorker ? "Creating..." : "+ New Worker"}
            </button>
          </div>

          {workers === undefined ? (
            <div className="text-center py-8 text-[#8b949e]">Loading...</div>
          ) : workers.length === 0 ? (
            <div className="border border-[#30363d] rounded-lg p-8 text-center bg-[#161b22]">
              <p className="text-[#8b949e]">
                {isCreatingWorker
                  ? "Creating worker... This may take a minute."
                  : "No workers running. The orchestrator will create workers as needed."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {workers.map((worker) => (
                <div
                  key={worker._id}
                  className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]"
                >
                  <div className="px-3 py-2 bg-[#21262d] flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#238636] text-white text-xs rounded">
                        WORKER
                      </span>
                      <span className="text-[#58a6ff]">
                        {worker.sandboxId.slice(0, 8)}...
                      </span>
                      {worker.repoUrl && (
                        <span className="text-[#8b949e] text-xs">
                          {worker.repoUrl.split("/").slice(-2).join("/")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={getProxiedVncUrl(worker.vncUrl, worker.vncToken)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8b949e] hover:text-[#c9d1d9]"
                      >
                        Open in Tab
                      </a>
                      <button
                        onClick={() => handleStop(worker.sandboxId, worker._id)}
                        disabled={stoppingIds.has(worker._id)}
                        className="px-3 py-1 bg-[#da3633] hover:bg-[#f85149] disabled:bg-[#da3633]/50
                                   text-white text-xs font-semibold rounded"
                      >
                        {stoppingIds.has(worker._id) ? "Stopping..." : "Stop"}
                      </button>
                    </div>
                  </div>
                  <iframe
                    src={`/vnc?url=${encodeURIComponent(worker.vncUrl)}&token=${encodeURIComponent(worker.vncToken || "")}`}
                    className="w-full h-[300px] border-0"
                    allow="clipboard-read; clipboard-write; fullscreen"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
