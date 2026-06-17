/**
 * Output helpers. Command handlers return a `Renderable` (a structured object or a
 * string); the axi SDK serializes objects to TOON at the output boundary and prepends
 * the bin/description header for the home view.
 *
 * This module is expanded by the `output-foundation` plan (preview caps, truncation,
 * relative time, export blocks). For the scaffold it carries only the shared types and
 * the not-implemented notice.
 */

export type StructuredOutput = Record<string, unknown>;
export type Renderable = string | StructuredOutput;

/** A structured "not implemented yet" notice for stub commands. */
export function notImplemented(command: string): StructuredOutput {
  return {
    message: `\`metabase-axi ${command}\` is not implemented yet`,
    help: [
      "This command is planned — see specs/commands/ and plans/ for the spec",
      "Run `metabase-axi --help` to see available commands",
    ],
  };
}
