import { CHARACTER_LIMIT } from "../constants.js";

export function formatJson(data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  if (json.length > CHARACTER_LIMIT) {
    return (
      json.slice(0, CHARACTER_LIMIT) +
      "\n\n... [Output truncated. Use pagination or filters to narrow results.]"
    );
  }
  return json;
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    const extra =
      "status" in error ? ` (HTTP ${(error as { status: number }).status})` : "";
    const errorsField =
      "errors" in error
        ? `\nValidation errors: ${JSON.stringify((error as { errors: unknown }).errors)}`
        : "";
    return `Error${extra}: ${error.message}${errorsField}`;
  }
  return `Error: ${String(error)}`;
}

export function toolResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function toolResultJson(data: unknown) {
  return toolResult(formatJson(data));
}
