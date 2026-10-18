import { describe, expect, it } from "vitest";
import {
	detectLocalAiCapability,
	localAiSummary,
} from "../../src/lib/domain/local-ai";

describe("local-ai detection", () => {
	it("(1) empty scope -> unavailable with reason", async () => {
		const scope = {};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(false);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe("No local AI APIs detected");
	});

	it('(2) LanguageModel with availability returning "available" -> available', async () => {
		const scope = {
			LanguageModel: {
				availability: async () => "available",
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("available");
		expect(result.reason).toBe("Prompt API is ready");
	});

	it('(3) LanguageModel with availability returning "downloadable" -> downloadable', async () => {
		const scope = {
			LanguageModel: {
				availability: async () => "downloadable",
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("downloadable");
		expect(result.reason).toBe("Prompt API model needs download");
	});

	it("(4) LanguageModel present but availability absent -> promptApi true and unavailable", async () => {
		const scope = {
			LanguageModel: {},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe(
			"LanguageModel present but no availability function",
		);
	});

	it("(5) throwing availability -> unavailable, no exception", async () => {
		const scope = {
			LanguageModel: {
				availability: async () => {
					throw new Error("Boom");
				},
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe("LanguageModel.availability threw an error");
	});

	it("(6) navigator.gpu present without a model API -> unavailable (webgpu true)", async () => {
		const scope = {
			navigator: {
				gpu: {},
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(false);
		expect(result.webgpu).toBe(true);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe("WebGPU is present but no model API was found");
	});

	it("(7) localAiSummary returns correct strings and omits cloud terms", () => {
		const s1 = localAiSummary({
			promptApi: true,
			webgpu: false,
			state: "available",
			reason: "",
		});
		const s2 = localAiSummary({
			promptApi: true,
			webgpu: false,
			state: "downloadable",
			reason: "",
		});
		const s3 = localAiSummary({
			promptApi: false,
			webgpu: false,
			state: "unavailable",
			reason: "No local AI APIs detected",
		});

		expect(s1).toBe("Status: on-device ready.");
		expect(s2).toBe("Status: the browser can download a local model.");
		expect(s3).toBe(
			"Status: the browser exposes no local model (No local AI APIs detected).",
		);

		const allStrings = [s1, s2, s3].join(" ");
		expect(allStrings).not.toMatch(/nube|cloud|cuota|créditos/i);
	});
});
