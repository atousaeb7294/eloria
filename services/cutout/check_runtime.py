"""Check the dedicated Windows venv without loading credentials or printing them."""
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
import sys


def main():
    for requirement in Path(__file__).with_name("requirements.txt").read_text().splitlines():
        if not requirement.strip() or requirement.startswith("#"):
            continue
        name, expected = requirement.split("==", 1)
        try:
            if version(name.split("[", 1)[0]) != expected:
                return 1
        except PackageNotFoundError:
            return 1
    if "--imports" in sys.argv:
        import onnxruntime
        onnxruntime.disable_telemetry_events()
        import rembg  # noqa: F401
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
