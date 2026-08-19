"""Put the repository root on sys.path so `scripts.*` imports resolve.

Every test module under tests/data imports this first. Keeping it in one place
avoids repeating path juggling and keeps the adapter importable without
installing the repo as a package.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
