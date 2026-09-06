export function validateInput(payload: any): string | null {
  // Basic validation: ensure required top-level fields exist
  if (!payload || typeof payload !== "object") return "Payload must be an object";
  if (!payload.report_type) return "Missing report_type";
  if (!payload.data) return "Missing data field";
  // Add more domain-specific checks as needed, e.g., numeric ranges
  // For now, accept any payload that passes above checks
  return null;
}
