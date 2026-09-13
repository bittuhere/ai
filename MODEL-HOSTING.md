# Self-hosting the BitLM models on your GitHub repo

BitLM normally pulls from public CDNs:

| Piece | Default source | Size |
|---|---|---|
| Engine JS | `vendor/web-llm.js` — **already in this repo** (falls back to esm.run / jsDelivr) | 6 MB |
| GPU kernels (wasm) | `models/lib/*.wasm` — **already in this repo** (falls back to GitHub raw CDN) | 10.5 MB |
| Model weights | Hugging Face CDN (one-time, then cached in the browser) | 290 / 207 MB |

To make the weights load from **your own site** (fastest for your visitors, no
dependency on Hugging Face), download them into the repo once and push:

```bash
node tools/fetch-bitlm-models.mjs all      # or: max | lite
git add models
git commit -m "self-host BitLM weights"
git push
```

That creates:

```
models/
├── lib/                                   # GPU kernel wasm (already committed)
├── bitlm-max/resolve/main/                # BitLM Max weights (Qwen2.5-0.5B, f32 edition)
│   ├── mlc-chat-config.json
│   ├── ndarray-cache.json / tensor-cache.json
│   ├── params_shard_0.bin … params_shard_7.bin   (all < 100 MB each ✓)
│   └── tokenizer.json, tokenizer_config.json, vocab.json, merges.txt
└── bitlm-lite/resolve/main/               # BitLM Lite weights (SmolLM2-360M, f32 edition)
```

The `resolve/main` sub-folder is required — the engine appends that path shape
when resolving model URLs.

**Runtime auto-detection:** on every load, BitLM probes
`models/<dir>/resolve/main/mlc-chat-config.json` on your site. If it exists →
weights load from your GitHub Pages URL. If not → it silently uses the public
CDN. Nothing to configure.

## Limits & notes

- Every file is under GitHub's 100 MB limit; total ≈ 497 MB for both models —
  within GitHub Pages' ~1 GB soft limit. Host only `max` if you want it lighter.
- The **f32 (compatible) editions** are what the site uses by default — they
  run on every WebGPU device, including GPUs that crash with
  `Invalid ShaderModule` on the f16 editions. The f16 editions are only tried
  as a secondary fallback on GPUs that advertise `shader-f16`, and are NOT
  self-hosted by the script (remote CDN is fine for that rare path).
- After the first visit, the browser caches the weights locally (Cache API) —
  visitors download once, exactly as promised in the UI.
- CPU mode (no WebGPU) uses a separate ONNX model from the Hugging Face CDN;
  its single file is >100 MB, so it cannot be hosted on GitHub Pages.
