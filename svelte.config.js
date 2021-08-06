/*
 * @Author: your name
 * @Date: 2021-08-06 20:50:11
 * @LastEditTime: 2021-08-06 21:06:06
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sveltekit-electron-test\svelte.config.js
 */
import sveltePreprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
import { build } from 'esbuild';
import { nodeExternalsPlugin } from "esbuild-node-externals"

electronMainBuild();
workerBuild();

/** @type {import("@sveltejs/kit").Config} */
const config = {
	kit: {
		adapter: adapter({}),
		target: '#svelte',
		ssr: false,
	},
	preprocess: sveltePreprocess(),
};

/** 处理electron main */
function electronMainBuild() {
	console.log("electronMainBuild")
	build({
		entryPoints: ['./electron/main.ts'],
		bundle: true,
		// platform: 'node',
		sourcemap: true,
		format: "cjs",
		outfile: './.electron/main.cjs',
		// outdir: "./.electron",
		watch: true,
		plugins: [nodeExternalsPlugin()],
	}).then(() => {
		console.log("electronMainBuild OK")
	})
}
/** 处理web worker */
function workerBuild() {
	console.log("workerBuild")
	build({
		entryPoints: ['./src/worker/worker.ts'],
		bundle: true,
		platform: 'node',
		sourcemap: true,
		format: "cjs",
		outfile: './static/worker/worker.js',
		charset: "utf8",
		watch: true,
		plugins: [nodeExternalsPlugin()],
	}).then(() => {
		console.log("workerBuild OK")
	})
}

export default config;