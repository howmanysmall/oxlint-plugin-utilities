export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is ReadonlyArray<string> {
	if (!Array.isArray(value)) return false;
	for (const item of value) if (typeof item !== "string") return false;
	return true;
}

export function isStringRecord(value: unknown): value is Record<string, string> {
	if (!isRecord(value)) return false;
	for (const entry of Object.values(value)) if (typeof entry !== "string") return false;
	return true;
}
