"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const sandboxes = useQuery(api.sandboxes.list);
  const createSandbox = useAction(api.daytona.createSandbox);
  const stopSandbox = useAction(api.daytona.stopSandbox);

  const [isCreating, setIsCreating] = useState(false);
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createSandbox({});
    } catch (error) {
      console.error("Failed to create sandbox:", error);
      alert("Failed to create sandbox: " + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStop = async (sandboxId: string, convexId: Id<"sandboxes">) => {
    setStoppingIds((prev) => new Set(prev).add(convexId));
    try {
      await stopSandbox({ sandboxId, convexId });
    } catch (error) {
      console.error("Failed to stop sandbox:", error);
      alert("Failed to stop sandbox: " + (error as Error).message);
    } finally {
      setStoppingIds((prev) => {
        const next = new Set(prev);
        next.delete(convexId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="px-6 py-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#f0f6fc]">Daytona Agents</h1>
        <span className="text-sm text-[#8b949e]">
          {sandboxes?.length ?? 0} instance(s) running
        </span>
      </header>

      {/* Controls */}
      <div className="px-6 py-4 border-b border-[#30363d] flex gap-3 items-center">
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                     text-white font-semibold rounded-md transition-colors"
        >
          {isCreating ? "Creating..." : "+ New Instance"}
        </button>
        {isCreating && (
          <span className="text-sm text-[#8b949e]">
            This may take up to a minute...
          </span>
        )}
      </div>

      {/* Sandbox Grid */}
      <div className="p-6">
        {sandboxes === undefined ? (
          <div className="text-center py-12 text-[#8b949e]">Loading...</div>
        ) : sandboxes.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-[#c9d1d9] mb-2">
              No instances running
            </h2>
            <p className="text-[#8b949e]">
              Click &quot;+ New Instance&quot; to create a sandbox with VNC
              desktop
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sandboxes.map((sandbox) => {
              const vncUrl = sandbox.vncToken
                ? `${sandbox.vncUrl}?token=${sandbox.vncToken}`
                : sandbox.vncUrl;

              return (
                <div
                  key={sandbox._id}
                  className="border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]"
                >
                  {/* Card Header */}
                  <div className="px-3 py-2 bg-[#21262d] flex justify-between items-center text-sm">
                    <span className="text-[#58a6ff]">
                      Sandbox: {sandbox.sandboxId.slice(0, 8)}...
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={vncUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8b949e] hover:text-[#c9d1d9]"
                      >
                        Open in Tab
                      </a>
                      <button
                        onClick={() =>
                          handleStop(sandbox.sandboxId, sandbox._id)
                        }
                        disabled={stoppingIds.has(sandbox._id)}
                        className="px-3 py-1 bg-[#da3633] hover:bg-[#f85149] disabled:bg-[#da3633]/50
                                   text-white text-xs font-semibold rounded"
                      >
                        {stoppingIds.has(sandbox._id) ? "Stopping..." : "Stop"}
                      </button>
                    </div>
                  </div>

                  {/* VNC Embed */}
                  <iframe
                    src={`/vnc?url=${encodeURIComponent(sandbox.vncUrl)}&token=${encodeURIComponent(sandbox.vncToken || "")}`}
                    className="w-full h-[500px] border-0"
                    allow="clipboard-read; clipboard-write; fullscreen"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
