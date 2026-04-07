#!/usr/bin/env python3
"""Script to preview subtitle segments from ASS file."""

import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from core.video_processor import _parse_srt

def preview_segments(ass_path: str):
    """Preview subtitle segments from ASS or SRT file."""
    path = Path(ass_path)
    if not path.exists():
        print(f"File not found: {ass_path}")
        return

    if path.suffix.lower() == ".ass":
        # For ASS files, we need to parse them differently
        content = path.read_text(encoding="utf-8")
        lines = content.split('\n')
        segments = []
        in_events = False
        for line in lines:
            if line.startswith('[Events]'):
                in_events = True
                continue
            if in_events and line.startswith('Dialogue:'):
                parts = line.split(',', 9)
                if len(parts) >= 10:
                    start_time = parts[1]
                    end_time = parts[2]
                    text = parts[9]
                    segments.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text
                    })
    elif path.suffix.lower() == ".srt":
        segments = _parse_srt(path)
    else:
        print(f"Unsupported file format: {path.suffix}")
        return

    print(f"📋 Preview of {len(segments)} subtitle segments from {path.name}:")
    print("=" * 80)

    for i, seg in enumerate(segments[:20], 1):  # Show first 20 segments
        start = seg.get('start', 'N/A')
        end = seg.get('end', 'N/A')
        text = seg.get('text', '').strip()
        print("2d")

        if len(text) > 100:
            text = text[:97] + "..."

    if len(segments) > 20:
        print(f"\n... and {len(segments) - 20} more segments")

    print("\n💡 To burn these subtitles into video, use the burn_subtitles function")
    print("   with subtitle_format='ass' for ASS files or 'srt' for SRT files")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python preview_segments.py <path_to_ass_or_srt_file>")
        sys.exit(1)

    preview_segments(sys.argv[1])