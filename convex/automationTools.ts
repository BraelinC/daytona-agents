/**
 * Automation Tools - Gemini Live API function definitions
 *
 * These tools allow Gemini to control a Daytona sandbox via screenshot analysis
 * and function calling. Tools map to existing control.ts actions.
 */

// Tool definitions for Gemini function calling
export const AUTOMATION_TOOLS = [
  {
    name: "click",
    description:
      "Click at x,y screen coordinates. Use when you need to click buttons, links, input fields, or any UI elements. Always click the CENTER of the element.",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate (0 = left edge, screen width = right edge)",
        },
        y: {
          type: "number",
          description: "Y coordinate (0 = top edge, screen height = bottom edge)",
        },
        button: {
          type: "string",
          enum: ["left", "right"],
          description: "Mouse button to click (default: left)",
        },
        double: {
          type: "boolean",
          description: "Double click (default: false)",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "type_text",
    description:
      "Type text at the current cursor position. Use after clicking on an input field. This simulates keyboard typing character by character.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to type",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "press_key",
    description:
      "Press a keyboard key or key combination. Common keys: Return (Enter), Tab, Escape, Backspace, Delete, Up, Down, Left, Right. For hotkeys like Ctrl+A, use the hotkey format.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Key name (Return, Tab, Escape, etc.) or hotkey combo (ctrl+a, ctrl+c, ctrl+v, ctrl+shift+s)",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "scroll",
    description:
      "Scroll the page up or down at current mouse position. Use to reveal content that's off-screen.",
    parameters: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Scroll direction",
        },
        amount: {
          type: "number",
          description: "Lines to scroll (default: 3)",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "wait",
    description:
      "Wait for a specified duration. Use after navigation, form submission, or when waiting for page loads and animations.",
    parameters: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Seconds to wait (max 10)",
        },
      },
      required: ["seconds"],
    },
  },
  {
    name: "screenshot",
    description:
      "Take a fresh screenshot to see the current screen state. Use when you need to verify the result of an action or see what happened.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "task_complete",
    description:
      "Signal that the automation task is finished. Call this when you have completed the requested task or when you determine the task cannot be completed.",
    parameters: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the task was completed successfully",
        },
        summary: {
          type: "string",
          description: "Brief summary of what was accomplished or why it failed",
        },
      },
      required: ["success", "summary"],
    },
  },
];

// System instruction template for the automation agent
export function buildSystemInstruction(task: string, screenWidth = 1024, screenHeight = 768): string {
  return `You are an automation agent controlling a desktop in a Daytona cloud sandbox.
You can see screenshots of the screen and use tools to interact with it.

## YOUR TASK
${task}

## SCREEN INFO
- Resolution: ${screenWidth}x${screenHeight} pixels
- Top-left corner is (0, 0)
- Bottom-right corner is (${screenWidth}, ${screenHeight})

## IMPORTANT RULES
1. ALWAYS analyze the screenshot carefully before taking any action
2. Click on the CENTER of buttons, links, and UI elements - not the edges
3. After clicking an input field, use type_text to enter data
4. Use press_key with "Return" to submit forms
5. Use wait after navigation or clicking links (pages need time to load)
6. If an action doesn't work, try a different approach
7. Call task_complete when finished, with success=true if completed or success=false if stuck

## INTERACTION PATTERNS
- To fill a form field: click(x, y) → type_text(text) → press_key("Tab") to move to next field
- To submit a form: click the submit button OR press_key("Return")
- To navigate: click links or type URL in address bar
- To scroll: use scroll(direction, amount) to reveal off-screen content

## TIPS
- Input fields often have placeholder text - click in the center of the field
- Buttons may have hover effects - wait briefly after hovering
- Dropdowns require clicking to open, then clicking an option
- If text doesn't appear after typing, the field may not be focused - click it again

Start by analyzing the initial screenshot and planning your approach.`;
}
