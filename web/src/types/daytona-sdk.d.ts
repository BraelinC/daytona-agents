declare module "daytona-sdk" {
  export class DaytonaConfig {
    constructor(config: {
      apiKey: string;
      apiUrl?: string;
      target?: string;
    });
  }

  export class CreateSandboxBaseParams {
    constructor(params: { public?: boolean });
  }

  export class Daytona {
    constructor(config: DaytonaConfig);
    create(params: CreateSandboxBaseParams): Promise<Sandbox>;
    delete(sandboxId: string): Promise<void>;
  }

  export interface Sandbox {
    id: string;
    computerUse: {
      start(): Promise<void>;
      keyboard: {
        type(text: string): Promise<void>;
        press(key: string, modifiers?: string[]): Promise<void>;
        hotkey(combo: string): Promise<void>;
      };
      mouse: {
        click(options: { x: number; y: number; button: string }): Promise<void>;
      };
    };
    process: {
      exec(
        command: string,
        options?: { timeout?: number }
      ): Promise<{ exit_code: number }>;
    };
    getPreviewLink(port: number): Promise<{ url: string; token?: string }>;
  }
}
