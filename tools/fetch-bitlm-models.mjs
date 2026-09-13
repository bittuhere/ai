#!/usr/bin/env node
/* fetch-bitlm-models.mjs — download the BitLM model weights into ./models/
   so YOUR GitHub repo self-hosts them (fast loading, no external CDN).

   Usage (from the repo root, Node 18+):
       node tools/fetch-bitlm-models.mjs max     # BitLM Max  (~290 MB)
       node tools/fetch-bitlm-models.mjs lite    # BitLM Lite (~207 MB)
       node tools/fetch-bitlm-models.mjs all     # both       (~497 MB)

   Then:  git add models/ && git commit -m "self-host BitLM weights" && git push

   The site AUTO-DETECTS these files at runtime — no code changes needed.
   Only the compatible f32 editions are fetched (they run on every WebGPU
   device, including GPUs that crash on the f16 editions). */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = {
    max:  { repo: 'mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC',  dir: 'bitlm-max'  },
    lite: { repo: 'mlc-ai/SmolLM2-360M-Instruct-q4f32_1-MLC',  dir: 'bitlm-lite' }
};
const SKIP = new Set(['README.md', '.gitattributes']);

const which = process.argv[2] || 'all';
const keys = which === 'all' ? Object.keys(TARGETS) : [which];
if (keys.some(k => !TARGETS[k])) {
    console.error('Usage: node tools/fetch-bitlm-models.mjs [max|lite|all]');
    process.exit(1);
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

for (const key of keys) {
    const { repo, dir } = TARGETS[key];
    const outDir = join(ROOT, 'models', dir, 'resolve', 'main');
    await mkdir(outDir, { recursive: true });
    console.log(`\n=== ${key} → models/${dir}/resolve/main/  (${repo}) ===`);

    const tree = await (await fetch(`https://huggingface.co/api/models/${repo}/tree/main`)).json();
    const files = tree.filter(f => f.type === 'file' && !SKIP.has(f.path));
    let done = 0;
    for (const f of files) {
        const dest = join(outDir, f.path);
        if (await exists(dest)) { console.log(`  = ${f.path} (already there)`); done++; continue; }
        const mb = (f.size / 1048576).toFixed(1);
        process.stdout.write(`  ↓ ${f.path} (${mb} MB)…`);
        const res = await fetch(`https://huggingface.co/${repo}/resolve/main/${f.path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${f.path}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length !== f.size) throw new Error(`size mismatch for ${f.path}: got ${buf.length}, want ${f.size}`);
        await writeFile(dest, buf);
        console.log(' ok');
        done++;
        console.log(`    [${done}/${files.length}]`);
    }
    console.log(`=== ${key} complete: ${done}/${files.length} files ===`);
}
console.log('\nAll done. Now:  git add models && git commit -m "self-host BitLM weights" && git push');
console.log('GitHub Pages will serve them from your own site — BitLM loads at full speed.');
