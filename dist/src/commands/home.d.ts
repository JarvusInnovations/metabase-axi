import { type StructuredOutput } from "../output.js";
/**
 * Content-first home view, also injected by the SessionStart hook. Resilient: never throws,
 * uses the cached profile summary when present, and degrades on an unreachable instance.
 */
export declare function homeCommand(): Promise<StructuredOutput>;
