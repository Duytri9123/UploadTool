#!/usr/bin/env python3
"""Demo script showing subtitle preview and burning capabilities."""

import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from core.video_processor import preview_subtitles_in_video, burn_subtitles

def demo_subtitle_preview():
    """Demo function showing how to preview and burn subtitles."""

    print("🎬 Subtitle Preview & Burn Demo")
    print("=" * 50)

    # Example paths (adjust these to your actual files)
    video_path = Path("Downloaded/example_video.mp4")  # Replace with actual video
    ass_path = Path("Downloaded/example_video.ass")    # Replace with actual ASS file

    if not video_path.exists():
        print(f"⚠️  Video not found: {video_path}")
        print("   Please adjust the paths in this script to point to actual files.")
        return

    if not ass_path.exists():
        print(f"⚠️  ASS file not found: {ass_path}")
        print("   Please adjust the paths in this script to point to actual files.")
        return

    # Find ffmpeg
    from core.video_processor import find_ffmpeg
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print("❌ ffmpeg not found. Please install ffmpeg first.")
        return

    print(f"✅ Found ffmpeg: {ffmpeg}")
    print(f"📹 Video: {video_path}")
    print(f"📄 ASS subtitles: {ass_path}")

    # 1. Create preview (first 30 seconds with subtitles overlaid)
    preview_path = video_path.parent / f"{video_path.stem}_preview.mp4"
    print(f"\n🔍 Creating preview: {preview_path.name}")
    print("   (This shows subtitles without burning them permanently)")

    ok, msg = preview_subtitles_in_video(
        video_path=video_path,
        ass_path=ass_path,
        output_path=preview_path,
        ffmpeg=ffmpeg,
        duration=30,  # 30 second preview
        font_size=36,
        font_color="yellow",
        subtitle_position="bottom"
    )

    if ok:
        print(f"✅ Preview created: {preview_path}")
        print("   Open this file to see subtitle positioning before burning!")
    else:
        print(f"❌ Preview failed: {msg}")
        return

    # 2. Burn subtitles permanently (optional - comment out if you don't want this)
    print("
🔥 Burning subtitles permanently into video..."    burned_path = video_path.parent / f"{video_path.stem}_burned.mp4"

    ok, msg = burn_subtitles(
        video_path=video_path,
        srt_path=ass_path,  # Can use ASS file here too
        output_path=burned_path,
        ffmpeg=ffmpeg,
        subtitle_format="ass",  # Use 'ass' for ASS files, 'srt' for SRT files
        blur_original=True,     # Blur original text area
        blur_zone="bottom",     # Blur bottom area where original subs were
        font_size=32,
        font_color="white",
        subtitle_position="bottom"
    )

    if ok:
        print(f"✅ Burned video created: {burned_path}")
        print("   Subtitles are now permanently embedded in the video!")
    else:
        print(f"❌ Burn failed: {msg}")

    print("
📋 Summary:"    print(f"   • Original video: {video_path}")
    print(f"   • ASS subtitles: {ass_path}")
    if preview_path.exists():
        print(f"   • Preview (temporary): {preview_path}")
    if burned_path.exists():
        print(f"   • Burned video: {burned_path}")

if __name__ == "__main__":
    demo_subtitle_preview()