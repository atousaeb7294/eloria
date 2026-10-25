# Built-in cutout runtime

The production build downloads and verifies BiRefNet Lite 512 FP32 from
[studioludens/birefnet-lite-512](https://huggingface.co/studioludens/birefnet-lite-512),
revision `962e67969ec6acec9c19fab76acee4f5e22e990c`.
The SHA-256 and immutable URL are in `model.mjs`; its MIT license is included in
`MODEL-LICENSE.txt`. The export derives from ZhengPeng7/BiRefNet_lite.

Inference runs locally on the application server through the pinned
`onnxruntime-node` CPU package (MIT). No customer/product image is uploaded to
Hugging Face. No Python service, Docker Desktop or new env values are required.
A valid existing `ELORIA_CUTOUT_URL` and token still take precedence.

The bundled application Dockerfile uses Debian/glibc for the native CPU binary.
Node buildpack deployments also need glibc (not Alpine/musl). The model is
downloaded at **build time**, not during a customer page request, and included in
Next standalone output. The server build needs access to Hugging Face and its
download CDN. Model weights and local caches are not committed to Git.

Each uncached photo uses one low-priority, single-threaded child process. It is
bounded to 110 seconds and exits after the photo, releasing model memory. The
existing global database lease serializes admin and automatic processing.
The source is limited to 8 MiB and 40 million pixels; output is bounded to
1280 square pixels and 8 MiB. Original product RGB is retained; only the alpha
mask, transparent margins and display size are prepared. Admin preview remains
necessary: automatic masks can lose small details or fail on complex photos.

Allow approximately 2 GiB RAM for inference, in addition to the running site.
The worker refuses opaque-image inference when Node reports less than 2304 MiB
free; a 4 GiB or larger application plan is a practical starting point, not a
guarantee under concurrent load. Already-transparent PNGs bypass inference and
the model/memory requirement. No hosting-plan change is performed by this patch.

Test commands (no database connection):

```
node scripts/test-builtin-cutout.mjs
node --import tsx scripts/test-home-editor-flow.ts
node --import tsx scripts/test-palace-recovery.ts
```
