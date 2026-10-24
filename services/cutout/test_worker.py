import io
import math
import unittest
import sys
import os
import subprocess
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import worker
from PIL import Image, ImageDraw
from worker import compose_cutout, prepare

class CutoutTests(unittest.TestCase):
    def test_native_http_and_parent_pipe_shutdown(self):
        with tempfile.TemporaryDirectory(prefix="eloria-native-http-") as directory:
            # Transparency takes the real HTTP/subprocess path without neural inference.
            Path(directory, worker.MODEL + ".onnx").write_bytes(b"test-model-placeholder")
            token = "native-http-test-token-" * 3
            env = {**os.environ, "U2NET_HOME": directory, "ELORIA_CUTOUT_TOKEN": token}
            process = subprocess.Popen(
                [sys.executable, str(Path(worker.__file__).resolve()), "--port", "0", "--watch-stdin"],
                env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            try:
                ready = process.stdout.readline().decode().strip()
                self.assertTrue(ready.startswith("Eloria cutout ready on 127.0.0.1:"), ready)
                url = "http://" + ready.split(" on ", 1)[1]
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(url + "/health", timeout=5)
                self.assertEqual(error.exception.code, 401)
                headers = {"Authorization": "Bearer " + token}
                with urllib.request.urlopen(urllib.request.Request(url + "/health", headers=headers), timeout=5) as response:
                    self.assertEqual(response.status, 200)
                original = Image.new("RGBA", (100, 100), (32, 64, 96, 0))
                ImageDraw.Draw(original).ellipse((20, 20, 80, 80), fill=(32, 64, 96, 255))
                source = io.BytesIO(); original.save(source, format="PNG")
                request = urllib.request.Request(url + "/cutout", data=source.getvalue(), headers=headers)
                with urllib.request.urlopen(request, timeout=15) as response:
                    result = Image.open(io.BytesIO(response.read()))
                    self.assertEqual(result.mode, "RGBA")
                    self.assertEqual(result.getchannel("A").getextrema(), (0, 255))
                process.stdin.close()
                self.assertEqual(process.wait(timeout=5), 0, "Closing the supervisor stops the native worker")
            finally:
                if process.poll() is None:
                    process.kill(); process.wait(timeout=5)
                process.stdout.close(); process.stderr.close()

    def test_telemetry_disabled_before_inference_session(self):
        calls = []
        fake_ort = SimpleNamespace(disable_telemetry_events=lambda: calls.append("telemetry-off"))
        fake_rembg = SimpleNamespace(new_session=lambda *_args, **_kwargs: calls.append("session") or object())
        with patch.object(worker, "SESSION", None), patch.dict(sys.modules, {"onnxruntime": fake_ort, "rembg": fake_rembg}):
            worker.get_session()
        self.assertEqual(calls, ["telemetry-off", "session"])

    def test_preserves_colors_hole_and_aspect(self):
        photo = Image.new("RGBA", (360, 240), (127, 32, 19, 255))
        mask = Image.new("L", photo.size, 0)
        pen = ImageDraw.Draw(mask)
        pen.ellipse((30, 40, 330, 200), fill=255)
        pen.ellipse((35, 45, 325, 195), fill=0)
        before = photo.tobytes()
        output = Image.open(io.BytesIO(compose_cutout(photo, mask)))
        self.assertEqual(photo.tobytes(), before)
        self.assertEqual(output.width, output.height)
        self.assertLessEqual(output.width, 1280)
        self.assertEqual(output.getpixel((output.width // 2, output.height // 2))[3], 0)
        bounds = output.getchannel("A").getbbox()
        width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
        self.assertEqual(width, 301)
        self.assertAlmostEqual(width / height, 301 / 161, delta=.02)
        self.assertTrue(all(math.hypot(x + .5 - output.width / 2, y + .5 - output.height / 2) < output.width / 2 for y in range(output.height) for x in range(output.width) if output.getpixel((x,y))[3] > 2))
        opaque = [p for p in output.get_flattened_data() if p[3] == 255]
        self.assertTrue(opaque)
        self.assertTrue(all(p[:3] == (127, 32, 19) for p in opaque))

    def test_rejects_empty_and_solid_masks(self):
        photo = Image.new("RGB", (100, 100))
        for alpha in (0, 255):
            with self.assertRaises(ValueError):
                compose_cutout(photo, Image.new("L", photo.size, alpha))

    def test_existing_transparency_is_not_multiplied_twice(self):
        original = Image.new("RGBA", (100, 100), (64, 128, 192, 0))
        pen = ImageDraw.Draw(original)
        pen.rectangle((20, 20, 80, 80), fill=(64, 128, 192, 255))
        pen.rectangle((18, 18, 82, 19), fill=(64, 128, 192, 128))
        data = io.BytesIO(); original.save(data, format="PNG")
        output = Image.open(io.BytesIO(prepare(data.getvalue())))
        self.assertIn(128, output.getchannel("A").get_flattened_data())

if __name__ == "__main__":
    unittest.main()
