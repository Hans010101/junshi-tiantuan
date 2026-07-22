#!/usr/bin/env python3
"""Build non-destructive, content-focused variants of strategy card images."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "public" / "advisors" / "strategy"
OUTPUT_ROOT = PROJECT_ROOT / "public" / "advisors" / "strategy-core"


def find_model_title_bottom(image: Image.Image) -> int | None:
    """Find the whitespace immediately below the large repeated model title."""
    pixels = np.asarray(image, dtype=np.int16)
    sample = pixels[::16, ::16].reshape(-1, 3)
    colors, counts = np.unique(sample, axis=0, return_counts=True)
    background = colors[counts.argmax()]
    margin = round(image.width * 0.04)
    different = np.square(pixels - background).sum(axis=2) > 100
    ink_by_row = different[:, margin:-margin].sum(axis=1)
    search_end = min(round(image.height * 0.35), image.height)
    blank_rows = np.flatnonzero(
        ink_by_row[:search_end] < max(8, round(image.width * 0.012))
    ).tolist()

    blocks: list[list[int]] = []
    for y in blank_rows:
        if not blocks or y > blocks[-1][-1] + 1:
            blocks.append([y])
        else:
            blocks[-1].append(y)

    minimum_gap = round(image.width * 0.018)
    minimum_start = round(image.width * 0.025)
    candidates = [
        block
        for block in blocks
        if len(block) >= minimum_gap and block[0] >= minimum_start
    ]
    return candidates[0][-1] + 1 if candidates else None


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

        focused = image.crop((0, top, image.width, bottom))
        title_bottom = find_model_title_bottom(focused)
        if title_bottom is None:
            raise ValueError(f"Could not detect model title boundary for {source}")
        content_top = max(0, title_bottom - round(focused.width * 0.01))

        destination.parent.mkdir(parents=True, exist_ok=True)
        focused.crop((0, content_top, focused.width, focused.height)).save(destination)
        return image.width, focused.height - content_top, has_complete_card


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
