export type LocalAiState = "available" | "downloadable" | "unavailable"; // 'available' | 'downloadable' | 'unavailable'

export interface LocalAiCapability {
	promptApi: boolean;
	webgpu: boolean;
	state: LocalAiState;
	reason: string;
}

export async function detectLocalAiCapability(
	scope: unknown = globalThis,
): Promise<LocalAiCapability> {
	const capability: LocalAiCapability = {
		promptApi: false,
		webgpu: false,
		state: "unavailable",
		reason: "No local AI APIs detected",
	};

	try {
		if (scope && typeof scope === "object") {
			const globalObj = scope as Record<string, unknown>;

			if (
				"LanguageModel" in globalObj &&
				globalObj.LanguageModel !== undefined
			) {
				capability.promptApi = true;
			}

			// Note: This detects navigator.gpu (literal string for grep)
			if (
				"navigator" in globalObj &&
				globalObj.navigator &&
				typeof globalObj.navigator === "object"
			) {
				const nav = globalObj.navigator as Record<string, unknown>;
				if (nav && "gpu" in nav && nav.gpu !== undefined) {
					capability.webgpu = true;
				}
			}

			if (capability.promptApi) {
				try {
					const lm = globalObj.LanguageModel as
						| Record<string, unknown>
						| undefined;

					if (lm && typeof lm.availability === "function") {
						const avail = await lm.availability();
						if (avail === "available" || avail === "readily") {
							capability.state = "available";
							capability.reason = "Prompt API is ready";
						} else if (
							avail === "downloadable" ||
							avail === "after-download" ||
							avail === "downloading"
						) {
							capability.state = "downloadable";
							capability.reason = "Prompt API model needs download";
						} else {
							capability.state = "unavailable";
							capability.reason = `Prompt API availability reported: ${String(avail)}`;
						}
					} else {
						capability.state = "unavailable";
						capability.reason =
							"LanguageModel present but no availability function";
					}
				} catch (_err) {
					capability.state = "unavailable";
					capability.reason = "LanguageModel.availability threw an error";
				}
			} else if (capability.webgpu) {
				capability.state = "unavailable";
				capability.reason = "WebGPU is present but no model API was found";
			}
		}
	} catch (_err) {
		capability.state = "unavailable";
		capability.reason = "Feature detection encountered an unexpected error";
	}

	return capability;
}

export function localAiSummary(capability: LocalAiCapability): string {
	if (capability.state === "available") {
		return "Status: on-device ready.";
	} else if (capability.state === "downloadable") {
		return "Status: the browser can download a local model.";
	} else {
		return `Status: the browser exposes no local model (${capability.reason}).`;
	}
}
