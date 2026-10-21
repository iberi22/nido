import { describe, expect, it, vi } from "vitest";
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

	it("(1.b) LanguageModel: undefined -> unavailable with reason (not present)", async () => {
		const scope = { LanguageModel: undefined };
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(false);
		expect(result.state).toBe("unavailable");
	});

	it("(1.c) LanguageModel hostile getter -> unavailable", async () => {
		const scope = {};
		Object.defineProperty(scope, "LanguageModel", {
			get() {
				throw new Error("Hostile getter");
			},
		});
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe(
			"Feature detection encountered an unexpected error",
		);
	});

	it('(2) LanguageModel with availability returning "available" -> available', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "available",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("available");
		expect(result.reason).toBe("Prompt API is ready");
		expect(create).not.toHaveBeenCalled();
	});

	it('(2.b) LanguageModel with availability returning "readily" -> available', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "readily",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.state).toBe("available");
		expect(create).not.toHaveBeenCalled();
	});

	it('(3) LanguageModel with availability returning "downloadable" -> downloadable', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "downloadable",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("downloadable");
		expect(result.reason).toBe("Prompt API model needs download");
		expect(create).not.toHaveBeenCalled();
	});

	it('(3.b) LanguageModel with availability returning "downloading" -> downloadable', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "downloading",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.state).toBe("downloadable");
		expect(create).not.toHaveBeenCalled();
	});

	it('(3.c) LanguageModel with availability returning "after-download" -> downloadable', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "after-download",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.state).toBe("downloadable");
		expect(create).not.toHaveBeenCalled();
	});

	it('(3.d) LanguageModel with availability returning "unavailable" -> unavailable', async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => "unavailable",
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.state).toBe("unavailable");
		expect(create).not.toHaveBeenCalled();
	});

	it("(4) LanguageModel present but availability absent -> promptApi true and unavailable", async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: { create },
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe(
			"LanguageModel present but no availability function",
		);
		expect(create).not.toHaveBeenCalled();
	});

	it("(5) throwing availability -> unavailable, no exception", async () => {
		const create = vi.fn();
		const scope = {
			LanguageModel: {
				availability: async () => {
					throw new Error("Boom");
				},
				create,
			},
		};
		const result = await detectLocalAiCapability(scope);
		expect(result.promptApi).toBe(true);
		expect(result.webgpu).toBe(false);
		expect(result.state).toBe("unavailable");
		expect(result.reason).toBe("LanguageModel.availability threw an error");
		expect(create).not.toHaveBeenCalled();
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
