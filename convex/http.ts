import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper to create JSON response with CORS
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper to handle errors
function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

// ============================================
// OPTIONS handlers for CORS preflight
// ============================================

http.route({
  path: "/api/sandbox/screenshot",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/execute",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/mouse/click",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/mouse/move",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/mouse/drag",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/mouse/scroll",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/keyboard/type",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/keyboard/press",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/keyboard/hotkey",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/display",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/fs/read",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/fs/write",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/fs/list",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/git/clone",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

// ============================================
// SCREENSHOT
// ============================================

http.route({
  path: "/api/sandbox/screenshot",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.takeScreenshot, {
        sandboxId: body.sandboxId,
        compressed: body.compressed,
        quality: body.quality,
        scale: body.scale,
        showCursor: body.showCursor,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// EXECUTE COMMAND
// ============================================

http.route({
  path: "/api/sandbox/execute",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.executeCommand, {
        sandboxId: body.sandboxId,
        command: body.command,
        cwd: body.cwd,
        timeout: body.timeout,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// MOUSE CONTROL
// ============================================

http.route({
  path: "/api/sandbox/mouse/click",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.mouseClick, {
        sandboxId: body.sandboxId,
        x: body.x,
        y: body.y,
        button: body.button,
        double: body.double,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/mouse/move",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.mouseMove, {
        sandboxId: body.sandboxId,
        x: body.x,
        y: body.y,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/mouse/drag",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.mouseDrag, {
        sandboxId: body.sandboxId,
        startX: body.startX,
        startY: body.startY,
        endX: body.endX,
        endY: body.endY,
        button: body.button,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/mouse/scroll",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.mouseScroll, {
        sandboxId: body.sandboxId,
        x: body.x,
        y: body.y,
        direction: body.direction,
        amount: body.amount,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// KEYBOARD CONTROL
// ============================================

http.route({
  path: "/api/sandbox/keyboard/type",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.keyboardType, {
        sandboxId: body.sandboxId,
        text: body.text,
        delay: body.delay,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/keyboard/press",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.keyboardPress, {
        sandboxId: body.sandboxId,
        key: body.key,
        modifiers: body.modifiers,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/keyboard/hotkey",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.keyboardHotkey, {
        sandboxId: body.sandboxId,
        keys: body.keys,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// DISPLAY INFO
// ============================================

http.route({
  path: "/api/sandbox/display",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.getDisplayInfo, {
        sandboxId: body.sandboxId,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// FILE SYSTEM
// ============================================

http.route({
  path: "/api/sandbox/fs/read",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.readFile, {
        sandboxId: body.sandboxId,
        path: body.path,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/fs/write",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.writeFile, {
        sandboxId: body.sandboxId,
        path: body.path,
        content: body.content,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/fs/list",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.listDirectory, {
        sandboxId: body.sandboxId,
        path: body.path,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// GIT OPERATIONS
// ============================================

http.route({
  path: "/api/sandbox/git/clone",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.control.gitClone, {
        sandboxId: body.sandboxId,
        repoUrl: body.repoUrl,
        targetPath: body.targetPath,
        branch: body.branch,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// SCREENSHOT STORAGE (saves to Convex, not sandbox disk)
// ============================================

http.route({
  path: "/api/sandbox/screenshot/store",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/screenshot/store",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.screenshotActions.takeAndStore, {
        sandboxId: body.sandboxId,
        compressed: body.compressed,
        quality: body.quality,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/screenshots",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/screenshots",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const screenshots = await ctx.runQuery(api.screenshots.listBySandbox, {
        sandboxId: body.sandboxId,
      });
      return jsonResponse({ screenshots });
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/screenshot/latest",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/screenshot/latest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const screenshot = await ctx.runQuery(api.screenshots.getLatest, {
        sandboxId: body.sandboxId,
      });
      return jsonResponse({ screenshot });
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandbox/screenshots/cleanup",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/screenshots/cleanup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.screenshots.cleanup, {
        sandboxId: body.sandboxId,
        keepLast: body.keepLast,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// CREATE SANDBOX WITH RESOURCES (for init agent)
// ============================================

http.route({
  path: "/api/sandbox/create",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/sandbox/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.daytona.createWithResources, {
        vcpu: body.vcpu,
        memory: body.memory,
        disk: body.disk,
        repoUrl: body.repoUrl,
        projectName: body.projectName,
        autoSetup: body.autoSetup,
      });
      return jsonResponse(result);
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

// ============================================
// HEALTH CHECK
// ============================================

http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
  }),
});

// ============================================
// LIST SANDBOXES
// ============================================

http.route({
  path: "/api/sandboxes",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const sandboxes = await ctx.runQuery(api.sandboxes.list);
      return jsonResponse({ sandboxes });
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandboxes/orchestrator",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const orchestrator = await ctx.runQuery(api.sandboxes.getOrchestrator);
      return jsonResponse({ orchestrator });
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

http.route({
  path: "/api/sandboxes/workers",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const workers = await ctx.runQuery(api.sandboxes.listWorkers);
      return jsonResponse({ workers });
    } catch (error) {
      return errorResponse((error as Error).message);
    }
  }),
});

export default http;
