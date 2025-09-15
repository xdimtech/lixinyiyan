import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: { 
		adapter: adapter(),
		// 配置 CSRF 保护 - 允许所有域名
		csrf: {
			trustedOrigins: ['*']
		},
	},
	extensions: ['.svelte', '.svx']
};

export default config;
