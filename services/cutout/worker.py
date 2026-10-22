"""Private CPU alpha-mask service. Original RGB is never generated/redrawn.

Run only inside the isolated Docker network; never expose its port publicly.
"""
import argparse
import hmac
import io
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

from PIL import Image, ImageChops, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000
MAX_BYTES = 8 * 1024 * 1024
MODEL = "birefnet-general-lite"
SESSION = None
LOCK = Lock()


def get_session():
    global SESSION
    if SESSION is None:
        import onnxruntime
        onnxruntime.disable_telemetry_events()
        from rembg import new_session
        SESSION = new_session(MODEL, providers=["CPUExecutionProvider"])
    return SESSION


def compose_cutout(original, mask):
    """Apply alpha only; preserve colors, proportions, thin cords and the inner hole."""
    source = original.convert("RGBA")
    mask = mask.convert("L").resize(source.size, Image.Resampling.LANCZOS)
    alpha = ImageChops.multiply(source.getchannel("A"), mask)
    histogram = alpha.histogram()
    pixels = source.width * source.height
    visible = sum(histogram[16:]) / pixels
    transparent = sum(histogram[:16]) / pixels
    if visible < .008 or transparent < .02 or max(alpha.getextrema()) < 200:
        raise ValueError("Uncertain foreground mask")
    source.putalpha(alpha)
    # Only transparent surroundings are removed; retained pixels keep their ratio.
    bounds = alpha.point(lambda p: 255 if p > 2 else 0).getbbox()
    if not bounds:
        raise ValueError("Empty mask")
    jewel = source.crop(bounds)
    # Resize color separately from alpha to avoid bright fringes on thin cords.
    color = ImageOps.contain(jewel.convert("RGB"), (1240, 984), Image.Resampling.LANCZOS)
    resized_alpha = jewel.getchannel("A").resize(color.size, Image.Resampling.LANCZOS)
    jewel = color.convert("RGBA")
    jewel.putalpha(resized_alpha)
    canvas = Image.new("RGBA", (1408, 1152), (0, 0, 0, 0))
    canvas.alpha_composite(jewel, ((1408 - jewel.width) // 2, (1152 - jewel.height) // 2))
    result = io.BytesIO()
    canvas.save(result, format="PNG", optimize=True)
    if result.tell() > MAX_BYTES:
        raise ValueError("Output too large")
    return result.getvalue()


def prepare(raw):
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("Input too large")
    with Image.open(io.BytesIO(raw)) as opened:
        if opened.format not in ("JPEG", "PNG", "WEBP") or getattr(opened, "n_frames", 1) != 1:
            raise ValueError("Unsupported image")
        if opened.width * opened.height > Image.MAX_IMAGE_PIXELS:
            raise ValueError("Too many pixels")
        source = ImageOps.exif_transpose(opened).convert("RGBA")
    source.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    if source.getchannel("A").getextrema()[0] == 0:
        # Keep existing transparency exactly, without multiplying alpha twice.
        return compose_cutout(source, Image.new("L", source.size, 255))
    session = get_session()
    from rembg import remove
    mask = remove(source.convert("RGB"), session=session, only_mask=True)
    return compose_cutout(source, mask)


class Handler(BaseHTTPRequestHandler):
    server_version = "EloriaCutout/1"

    def setup(self):
        super().setup()
        self.connection.settimeout(20)

    def reply(self, status, body=b"", content_type="text/plain"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        expected = "Bearer " + os.environ["ELORIA_CUTOUT_TOKEN"]
        return hmac.compare_digest(self.headers.get("Authorization", ""), expected)

    def do_GET(self):
        if not self.authorized():
            return self.reply(401)
        return self.reply(200 if self.path == "/health" else 404, b"ready")

    def do_POST(self):
        if not self.authorized():
            return self.reply(401)
        if self.path != "/cutout":
            return self.reply(404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400)
        if self.headers.get("Transfer-Encoding") or not 0 < length <= MAX_BYTES:
            return self.reply(413)
        if not LOCK.acquire(blocking=False):
            return self.reply(429, b"busy")
        try:
            raw = self.rfile.read(length)
            if len(raw) != length:
                return self.reply(400)
            # A fresh subprocess releases the model memory after every photo.
            with tempfile.TemporaryDirectory(prefix="eloria-cutout-") as work:
                source_path, output_path = Path(work) / "input", Path(work) / "output.png"
                source_path.write_bytes(raw)
                run = subprocess.run(
                    [sys.executable, str(Path(__file__).resolve()), "--process", str(source_path), str(output_path)],
                    timeout=110, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
                )
                if run.returncode == 2:
                    return self.reply(422, b"image_or_mask_invalid")
                if run.returncode or not output_path.is_file() or output_path.stat().st_size > MAX_BYTES:
                    return self.reply(503, b"processing_failed")
                result = output_path.read_bytes()
            self.reply(200, result, "image/png")
        except (ValueError, OSError, Image.DecompressionBombError):
            self.reply(422, b"image_or_mask_invalid")
        except Exception:
            self.reply(503, b"processing_failed")
        finally:
            LOCK.release()

    def log_message(self, *_args):
        pass  # Do not log credentials, image paths or image contents.


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-model", action="store_true")
    parser.add_argument("--process", nargs=2, metavar=("INPUT", "OUTPUT"))
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    os.environ.setdefault("OMP_NUM_THREADS", "2")
    os.environ.setdefault("U2NET_HOME", str(Path.cwd() / ".cache" / "eloria-cutout"))
    if args.process:
        try:
            source_path, output_path = map(Path, args.process)
            if source_path.stat().st_size > MAX_BYTES:
                raise ValueError("Input too large")
            output_path.write_bytes(prepare(source_path.read_bytes()))
        except (ValueError, OSError, Image.DecompressionBombError):
            raise SystemExit(2)
    elif args.download_model:
        # Build-time download only; do not start inference or process product photos.
        import onnxruntime
        onnxruntime.disable_telemetry_events()
        from rembg.sessions.birefnet_general_lite import BiRefNetSessionGeneralLite
        BiRefNetSessionGeneralLite.download_models()
        print("BiRefNet Lite model ready.")
    else:
        if len(os.environ.get("ELORIA_CUTOUT_TOKEN", "")) < 32:
            raise SystemExit("ELORIA_CUTOUT_TOKEN must contain at least 32 characters.")
        model_root = Path(os.environ["U2NET_HOME"])
        if not any(p.is_file() for p in (model_root / "models" / MODEL / f"{MODEL}.onnx", model_root / f"{MODEL}.onnx")):
            raise SystemExit("Build the isolated cutout image first.")
        print(f"Eloria cutout ready on {args.bind}:{args.port}", flush=True)
        ThreadingHTTPServer((args.bind, args.port), Handler).serve_forever()
