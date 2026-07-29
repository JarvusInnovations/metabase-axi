export function parseArgs(args, opts = {}) {
    const valued = new Set(opts.valued ?? []);
    const positionals = [];
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const token = args[i];
        if (token === "-" || !token.startsWith("--")) {
            positionals.push(token);
            continue;
        }
        const body = token.slice(2);
        const eq = body.indexOf("=");
        if (eq >= 0) {
            flags[body.slice(0, eq)] = body.slice(eq + 1);
            continue;
        }
        const next = args[i + 1];
        if (valued.has(body) && next !== undefined && !next.startsWith("--")) {
            flags[body] = next;
            i++;
        }
        else {
            flags[body] = true;
        }
    }
    return { positionals, flags };
}
/** Read a flag as a string, or undefined when absent / boolean-only. */
export function strFlag(parsed, name) {
    const v = parsed.flags[name];
    return typeof v === "string" ? v : undefined;
}
/** Read a flag as a number, or undefined. Throws-free: returns undefined on NaN. */
export function numFlag(parsed, name) {
    const v = strFlag(parsed, name);
    if (v === undefined)
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
/** True when the flag is present in any form (boolean true or a string value). */
export function hasFlag(parsed, name) {
    return parsed.flags[name] !== undefined;
}
//# sourceMappingURL=flags.js.map