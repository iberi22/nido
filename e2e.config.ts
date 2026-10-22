import { web } from "@e2e-dev/web";
import type { E2EConfig } from "e2e";

const config = {
	tests: ["e2e-ta/**/*.e2e.ts", "!e2e-ta/findings/**"],
	targets: [
		{
			name: "local",
			engine: web(),
			app: {
				url: "http://127.0.0.1:0",
				command: {
					executable: "npm",
					args: [
						"run",
						"preview",
						"--",
						"--host",
						"127.0.0.1",
						"--port",
						"{port}",
						"--strictPort",
					],
					log: ".e2e/logs/app.log",
					startupTimeout: 120000,
				},
			},
		},
	],
} satisfies E2EConfig;

if (process.env.E2E_LIVE_URL) {
	config.targets.push({
		name: "live",
		engine: web(),
		app: {
			url: process.env.E2E_LIVE_URL,
		},
	});
}

export default config;
