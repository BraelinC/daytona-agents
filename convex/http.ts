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
// HEALTH CHECK
// ============================================

http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
  }),
});

export default http;
