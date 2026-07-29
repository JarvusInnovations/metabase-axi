/**
 * Minimal argument parser for command handlers. Splits a command's args into positionals
 * and flags. `--key=value` always yields a string value; `--key value` yields a string
 * value only when `key` is in `valued` and the next token isn't a flag; otherwise `--key`
 * is a boolean `true`. A lone `-` is a positional (the stdin marker).
 */
export interface ParsedArgs {
    positionals: string[];
    flags: Record<string, string | boolean>;
}
export declare function parseArgs(args: string[], opts?: {
    valued?: string[];
}): ParsedArgs;
/** Read a flag as a string, or undefined when absent / boolean-only. */
export declare function strFlag(parsed: ParsedArgs, name: string): string | undefined;
/** Read a flag as a number, or undefined. Throws-free: returns undefined on NaN. */
export declare function numFlag(parsed: ParsedArgs, name: string): number | undefined;
/** True when the flag is present in any form (boolean true or a string value). */
export declare function hasFlag(parsed: ParsedArgs, name: string): boolean;
