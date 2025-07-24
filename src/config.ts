export interface GenerationTask {
	target: string;
	input?: string;
	output?: string;
}

export interface Config {
	input?: string;
	output?: string;
	tasks: GenerationTask[];
}

export function defineConfig(config: Config): Config {
	return config;
}
