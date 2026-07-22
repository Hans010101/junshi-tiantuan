#!/usr/bin/env python3
"""Build non-destructive, content-focused variants of strategy card images."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "public" / "advisors" / "strategy"
OUTPUT_ROOT = PROJECT_ROOT / "public" / "advisors" / "strategy-core"


def find_insight_box_bottom(image: Image.Image) -> int | None:
    pixels = np.asarray(image, dtype=np.int16)
    sample = pixels[::16, ::16].reshape(-1, 3)
    colors, counts = np.unique(sample, axis=0, return_counts=True)
    background = colors[counts.argmax()]
    threshold = int(image.width * 0.5)
    lower = pixels[image.height // 2 : max(image.height // 2, image.height - 24), 20 : image.width - 20]
    different = np.square(lower - background).sum(axis=2) > 25
    counts_by_row = different.sum(axis=1)
    high_rows = (np.flatnonzero(counts_by_row >= threshold) + image.height // 2).tolist()
    if not high_rows:
        return None

    blocks: list[list[int]] = []
    for y in high_rows:
        if not blocks or y > blocks[-1][-1] + 1:
            blocks.append([y])
        else:
            blocks[-1].append(y)

    candidates = [block for block in blocks if len(block) >= 20]
    return candidates[-1][-1] if candidates else None


def build_core_image(source: Path, destination: Path) -> tuple[int, int, bool]:
    with Image.open(source) as original:
        image = original.convert("RGB")
        top = round(image.width * 0.18)
        insight_bottom = None if image.height / image.width < 0.75 else find_insight_box_bottom(image)
        if insight_bottom is None:
            bottom = image.height
            has_complete_card = False
        else:
            bottom = min(image.height, insight_bottom + round(image.width * 0.016))
            has_complete_card = True

        if bottom <= top:
            raise ValueError(f"Invalid crop bounds for {source}: top={top}, bottom={bottom}")

        destination.parent.mkdir(parents=True, exist_ok=True)
        image.crop((0, top, image.width, bottom)).save(destination)
        return image.width, bottom - top, has_complete_card


def main() -> None:
    sources = sorted(SOURCE_ROOT.glob("*/model-*.png"))
    incomplete: list[str] = []
    for source in sources:
        relative = source.relative_to(SOURCE_ROOT)
        width, height, complete = build_core_image(source, OUTPUT_ROOT / relative)
        if not complete:
            incomplete.append(f"{relative} ({width}x{height} core crop)")

    print(f"Built {len(sources)} core strategy images in {OUTPUT_ROOT}")
    print(f"Source cards without a detectable insight/footer block: {len(incomplete)}")
    for item in incomplete:
        print(f"- {item}")


if __name__ == "__main__":
    main()
