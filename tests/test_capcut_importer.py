#!/usr/bin/env python3
"""
Test CapCut importer functionality
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.capcut_importer import CapCutImporter


def test_find_capcut():
    """Test tìm đường dẫn CapCut."""
    print("Testing CapCut path detection...")
    importer = CapCutImporter()
    
    if importer.capcut_path:
        print(f"✓ CapCut found at: {importer.capcut_path}")
        return True
    else:
        print("✗ CapCut not found")
        print("  Please install CapCut or set custom path")
        return False


def test_list_drafts():
    """Test liệt kê drafts."""
    print("\nTesting draft listing...")
    importer = CapCutImporter()
    
    if not importer.capcut_path:
        print("✗ Skipped (CapCut not found)")
        return False
    
    drafts = importer.list_drafts()
    print(f"✓ Found {len(drafts)} draft(s)")
    
    for draft in drafts[:5]:  # Show first 5
        print(f"  - {draft['name']} ({draft['id']})")
    
    return True


def test_import_video(video_path: str = None, srt_path: str = None):
    """Test import video vào CapCut."""
    print("\nTesting video import...")
    importer = CapCutImporter()
    
    if not importer.capcut_path:
        print("✗ Skipped (CapCut not found)")
        return False
    
    # Nếu không có video test, tạo file dummy
    if not video_path:
        print("  No test video provided, skipping import test")
        return True
    
    video_path = Path(video_path)
    if not video_path.exists():
        print(f"✗ Video not found: {video_path}")
        return False
    
    srt_path = Path(srt_path) if srt_path else None
    if srt_path and not srt_path.exists():
        print(f"  Warning: SRT not found: {srt_path}")
        srt_path = None
    
    result = importer.import_video(
        video_path=video_path,
        srt_path=srt_path,
        project_name="Test Import",
        auto_open=False,
    )
    
    if result["success"]:
        print(f"✓ Import successful")
        print(f"  Project: {result['project_name']}")
        print(f"  ID: {result['project_id']}")
        print(f"  Path: {result['draft_path']}")
        return True
    else:
        print(f"✗ Import failed: {result['message']}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("CapCut Importer Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test 1: Find CapCut
    results.append(("Find CapCut", test_find_capcut()))
    
    # Test 2: List drafts
    results.append(("List Drafts", test_list_drafts()))
    
    # Test 3: Import video (optional - requires test file)
    import sys
    if len(sys.argv) > 1:
        video = sys.argv[1]
        srt = sys.argv[2] if len(sys.argv) > 2 else None
        results.append(("Import Video", test_import_video(video, srt)))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
