"use node";

/**
 * Gemini Live Automation - AI-driven browser automation via Daytona sandboxes
 *
 * Uses Gemini Live API (WebSocket) for real-time vision and function calling
 * to analyze screenshots and execute actions on the sandbox.
 *
 * Based on Healthymama's Gemini Live integration pattern.
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { AUTOMATION_TOOLS, buildSystemInstruction } from "./automationTools";
import WebSocket from "ws";

// Gemini Live API WebSocket endpoint
const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

// Model for vision + function calling
const GEMINI_MODEL = "models/gemini-2.0-flash-exp";

// Maximum iterations to prevent infinite loops
const MAX_ITERATIONS = 50;

// Screen streaming settings
const DEFAULT_FRAME_RATE = 4; // 4 FPS default (250ms between frames)
const MIN_FRAME_INTERVAL_MS = 100; // Max 10 FPS to avoid rate limiting

// Tool call interface
interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/**
 * Execute a tool call on the sandbox
 */
async function executeTool(
  ctx: any,
  sandboxId: string,
  toolCall: ToolCall
): Promise<any> {
  console.log(`[GeminiLive] Executing tool: ${toolCall.name}`, toolCall.args);

  switch (toolCall.name) {
    case "click": {
      const { x, y, button = "left", double: isDouble = false } = toolCall.args;
      await ctx.runAction(api.control.mouseClick, {
        sandboxId,
        x: Math.round(x),
        y: Math.round(y),
        button,
        double: isDouble,
      });
      return { success: true, action: `Clicked at (${x}, ${y})` };
    }

    case "type_text": {
      const { text } = toolCall.args;
      await ctx.runAction(api.control.keyboardType, {
        sandboxId,
        text,
      });
      return { success: true, action: `Typed "${text.substring(0, 50)}..."` };
    }

    case "press_key": {
      const { key } = toolCall.args;
      if (key.includes("+")) {
        await ctx.runAction(api.control.keyboardHotkey, {
          sandboxId,
          keys: key,
        });
      } else {
        await ctx.runAction(api.control.keyboardPress, {
          sandboxId,
          key,
        });
      }
      return { success: true, action: `Pressed ${key}` };
    }

    case "scroll": {
      const { direction, amount = 3 } = toolCall.args;
      const displayInfo = await ctx.runAction(api.control.getDisplayInfo, {
        sandboxId,
      });
      const centerX = (displayInfo.display?.width || 1024) / 2;
      const centerY = (displayInfo.display?.height || 768) / 2;
      await ctx.runAction(api.control.mouseScroll, {
        sandboxId,
        x: centerX,
        y: centerY,
        direction,
        amount,
      });
      return { success: true, action: `Scrolled ${direction} ${amount} lines` };
    }

    case "wait": {
      const { seconds } = toolCall.args;
      const waitMs = Math.min(seconds, 10) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return { success: true, action: `Waited ${seconds} seconds` };
    }

    case "screenshot": {
      return { success: true, action: "Screenshot requested" };
    }

    case "task_complete": {
      const { success, summary } = toolCall.args;
      return { taskComplete: true, success, summary };
    }

    default:
      return { error: `Unknown tool: ${toolCall.name}` };
  }
}

/**
 * Take a screenshot and return as base64
 */
async function takeScreenshot(ctx: any, sandboxId: string): Promise<string> {
  const result = await ctx.runAction(api.control.takeScreenshot, {
    sandboxId,
    compressed: true,
    quality: 70,
  });
  return result.image;
}

/**
 * Run Gemini Live automation session via WebSocket
 * With continuous screen streaming (like Healthymama video streaming)
 */
async function runGeminiLiveSession(
  ctx: any,
  apiKey: string,
  sandboxId: string,
  task: string,
  taskId: any,
  maxIterations: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let iteration = 0;
    let isComplete = false;
    let screenStreamInterval: NodeJS.Timeout | null = null;
    let isProcessingToolCall = false;

    // Connect to Gemini Live WebSocket
    const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
    const ws = new WebSocket(wsUrl);

    const cleanup = () => {
      // Stop screen streaming
      if (screenStreamInterval) {
        clearInterval(screenStreamInterval);
        screenStreamInterval = null;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    // Start continuous screen streaming (like Healthymama video frames)
    const startScreenStreaming = () => {
      console.log("[GeminiLive] Starting continuous screen streaming...");

      screenStreamInterval = setInterval(async () => {
        // Don't send frames while processing a tool call
        if (isProcessingToolCall || ws.readyState !== WebSocket.OPEN) return;

        try {
          const screenshot = await takeScreenshot(ctx, sandboxId);

          const frameMessage = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: "image/jpeg",
                data: screenshot,
              }],
            },
          };

          ws.send(JSON.stringify(frameMessage));
          console.log("[GeminiLive] Screen frame sent");
        } catch (err) {
          console.error("[GeminiLive] Error sending screen frame:", err);
        }
      }, SCREEN_STREAM_INTERVAL_MS);
    };

    ws.on("open", async () => {
      console.log("[GeminiLive] WebSocket connected");

      // Send setup message (like Healthymama pattern)
      const setupMessage = {
        setup: {
          model: GEMINI_MODEL,
          generationConfig: {
            responseModalities: ["TEXT"],
            temperature: 0.2,
          },
          systemInstruction: {
            parts: [{ text: buildSystemInstruction(task) }],
          },
          tools: [{ functionDeclarations: AUTOMATION_TOOLS }],
        },
      };

      console.log("[GeminiLive] Sending setup...");
      ws.send(JSON.stringify(setupMessage));
    });

    ws.on("message", async (data: Buffer | string) => {
      try {
        const text = data instanceof Buffer ? data.toString() : data;
        const message = JSON.parse(text);

        console.log("[GeminiLive] Message keys:", Object.keys(message));

        // Setup complete - start screen streaming and send initial prompt
        if (message.setupComplete) {
          console.log("[GeminiLive] Setup complete");

          // Send initial screenshot immediately
          const screenshot = await takeScreenshot(ctx, sandboxId);
          const inputMessage = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: "image/jpeg",
                data: screenshot,
              }],
            },
          };
          ws.send(JSON.stringify(inputMessage));

          // Send text prompt to start the task
          const textMessage = {
            clientContent: {
              turns: [{
                role: "user",
                parts: [{ text: "You can see my screen now. I'm streaming it to you continuously. Analyze what you see and start the task. Use the tools to interact with the screen. The screen updates every second so you can see the results of your actions." }],
              }],
              turnComplete: true,
            },
          };
          ws.send(JSON.stringify(textMessage));

          // Start continuous screen streaming
          startScreenStreaming();
          return;
        }

        // Tool call from Gemini
        if (message.toolCall?.functionCalls) {
          isProcessingToolCall = true;

          for (const funcCall of message.toolCall.functionCalls) {
            const toolCall: ToolCall = {
              id: funcCall.id,
              name: funcCall.name,
              args: funcCall.args || {},
            };

            iteration++;
            console.log(`[GeminiLive] Iteration ${iteration}/${maxIterations}: ${toolCall.name}`);

            // Execute the tool
            const result = await executeTool(ctx, sandboxId, toolCall);

            // Check if task is complete
            if (result.taskComplete) {
              isComplete = true;
              await ctx.runMutation(internal.automationTasks.updateStatus, {
                taskId,
                status: result.success ? "completed" : "failed",
                result: result.summary,
              });
              console.log(`[GeminiLive] Task ${result.success ? "completed" : "failed"}: ${result.summary}`);
              cleanup();
              resolve();
              return;
            }

            // Check iteration limit
            if (iteration >= maxIterations) {
              isComplete = true;
              await ctx.runMutation(internal.automationTasks.updateStatus, {
                taskId,
                status: "failed",
                result: `Reached maximum iterations (${maxIterations})`,
              });
              cleanup();
              resolve();
              return;
            }

            // Send tool response back to Gemini
            const toolResponse = {
              toolResponse: {
                functionResponses: [{
                  id: toolCall.id,
                  response: result,
                }],
              },
            };
            ws.send(JSON.stringify(toolResponse));

            // Brief pause for UI to update after action
            await new Promise((r) => setTimeout(r, 300));
          }

          isProcessingToolCall = false;
          return;
        }

        // Server content (text response)
        if (message.serverContent) {
          const content = message.serverContent;

          if (content.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.text) {
                console.log("[GeminiLive] Gemini says:", part.text.substring(0, 200));
              }
            }
          }

          if (content.turnComplete) {
            console.log("[GeminiLive] Turn complete");
          }
          return;
        }

        // Go away (server disconnecting)
        if (message.goAway) {
          console.log("[GeminiLive] Server disconnecting:", message.goAway);
          if (!isComplete) {
            await ctx.runMutation(internal.automationTasks.updateStatus, {
              taskId,
              status: "failed",
              result: "Server disconnected",
            });
          }
          cleanup();
          resolve();
          return;
        }

      } catch (err) {
        console.error("[GeminiLive] Message handling error:", err);
      }
    });

    ws.on("error", async (error) => {
      console.error("[GeminiLive] WebSocket error:", error);
      await ctx.runMutation(internal.automationTasks.updateStatus, {
        taskId,
        status: "failed",
        result: `WebSocket error: ${error.message}`,
      });
      cleanup();
      reject(error);
    });

    ws.on("close", async (code, reason) => {
      console.log("[GeminiLive] WebSocket closed:", code, reason.toString());
      if (!isComplete) {
        await ctx.runMutation(internal.automationTasks.updateStatus, {
          taskId,
          status: "failed",
          result: `Connection closed: ${code}`,
        });
      }
      cleanup();
      resolve();
    });

    // Timeout after 5 minutes
    setTimeout(async () => {
      if (!isComplete) {
        console.log("[GeminiLive] Session timeout");
        await ctx.runMutation(internal.automationTasks.updateStatus, {
          taskId,
          status: "failed",
          result: "Session timeout (5 minutes)",
        });
        cleanup();
        resolve();
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Start automation task - main entry point
 */
export const startAutomation = action({
  args: {
    sandboxId: v.string(),
    task: v.string(),
    maxIterations: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    taskId: string;
    status: "started" | "error";
    error?: string;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { taskId: "", status: "error", error: "GEMINI_API_KEY not set" };
    }

    // Create task record
    const taskId = await ctx.runMutation(api.automationTasks.create, {
      sandboxId: args.sandboxId,
      task: args.task,
    });

    // Start the automation loop in background
    ctx.scheduler.runAfter(0, internal.geminiAutomation.runAutomationLoop, {
      taskId,
      sandboxId: args.sandboxId,
      task: args.task,
      maxIterations: args.maxIterations || MAX_ITERATIONS,
    });

    return { taskId: taskId as string, status: "started" };
  },
});

/**
 * Internal action that runs the Gemini Live automation loop
 */
export const runAutomationLoop = internalAction({
  args: {
    taskId: v.id("automationTasks"),
    sandboxId: v.string(),
    task: v.string(),
    maxIterations: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.automationTasks.updateStatus, {
        taskId: args.taskId,
        status: "failed",
        result: "GEMINI_API_KEY not set",
      });
      return;
    }

    try {
      await runGeminiLiveSession(
        ctx,
        apiKey,
        args.sandboxId,
        args.task,
        args.taskId,
        args.maxIterations
      );
    } catch (error: any) {
      console.error("[GeminiLive] Error:", error);
      await ctx.runMutation(internal.automationTasks.updateStatus, {
        taskId: args.taskId,
        status: "failed",
        result: error.message || "Unknown error",
      });
    }
  },
});

/**
 * Get automation task status
 */
export const getTaskStatus = action({
  args: {
    taskId: v.id("automationTasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(api.automationTasks.get, { taskId: args.taskId });
  },
});

/**
 * Stop a running automation task
 */
export const stopAutomation = action({
  args: {
    taskId: v.id("automationTasks"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.automationTasks.updateStatus, {
      taskId: args.taskId,
      status: "failed",
      result: "Stopped by user",
    });
    return { success: true };
  },
});
