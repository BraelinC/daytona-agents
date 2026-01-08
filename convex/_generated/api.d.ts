/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as control from "../control.js";
import type * as daytona from "../daytona.js";
import type * as http from "../http.js";
import type * as orchestrator from "../orchestrator.js";
import type * as preloads from "../preloads.js";
import type * as sandboxes from "../sandboxes.js";
import type * as screenshotActions from "../screenshotActions.js";
import type * as screenshots from "../screenshots.js";
import type * as workers from "../workers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  control: typeof control;
  daytona: typeof daytona;
  http: typeof http;
  orchestrator: typeof orchestrator;
  preloads: typeof preloads;
  sandboxes: typeof sandboxes;
  screenshotActions: typeof screenshotActions;
  screenshots: typeof screenshots;
  workers: typeof workers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
