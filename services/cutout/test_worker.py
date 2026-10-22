import io
import unittest
import sys
from types import SimpleNamespace
from unittest.mock import patch
import worker
from PIL import Image, ImageDraw
from worker import compose_cutout, prepare

class CutoutTests(unittest.TestCase):
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
        self.assertEqual(output.size, (1408, 1152))
        self.assertEqual(output.getpixel((704, 576))[3], 0)
        bounds = output.getchannel("A").getbbox()
        width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
        self.assertGreater(width, 1200)
        self.assertAlmostEqual(width / height, 301 / 161, delta=.02)
        self.assertLess(((1240 / 2) ** 2 + (984 / 2) ** 2) ** .5 * .84, 1408 / 2)
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
