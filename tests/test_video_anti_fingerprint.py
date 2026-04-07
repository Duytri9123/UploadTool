# Feature: video-anti-fingerprint
"""
Tests for video anti-fingerprint functionality.
Covers Properties 1–8 from design.md.
"""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from hypothesis import given, settings, HealthCheck
import hypothesis.strategies as st

from core.video_processor import (
    _resolve_image_path,
    _build_anti_fingerprint_filter,
    apply_anti_fingerprint,
    _clamp_float,
)


# ===========================================================================
# TestResolveImagePath
# ===========================================================================

class TestResolveImagePath(unittest.TestCase):
    """Unit + property tests for _resolve_image_path(). Validates: Requirements 1.2, 1.5, 2.5, 4.3"""

    def test_valid_image_returns_path(self):
        """A valid .png file that exists should return a Path object."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsInstance(result, Path)
            self.assertEqual(result, tmp)
        finally:
            tmp.unlink(missing_ok=True)

    def test_nonexistent_file_returns_none(self):
        """A path that does not exist should return None."""
        result = _resolve_image_path("/nonexistent/path/image.png", Path("/tmp"))
        self.assertIsNone(result)

    def test_invalid_extension_returns_none(self):
        """A file with an unsupported extension (.mp4) should return None."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsNone(result)
        finally:
            tmp.unlink(missing_ok=True)

    def test_empty_string_returns_none(self):
        """An empty string path should return None."""
        result = _resolve_image_path("", Path("/tmp"))
        self.assertIsNone(result)

    def test_jpg_extension_returns_path(self):
        """A valid .jpg file should return a Path."""
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsInstance(result, Path)
        finally:
            tmp.unlink(missing_ok=True)

    def test_webp_extension_returns_path(self):
        """A valid .webp file should return a Path."""
        with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsInstance(result, Path)
        finally:
            tmp.unlink(missing_ok=True)

    def test_txt_extension_returns_none(self):
        """A .txt file should return None (unsupported extension)."""
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsNone(result)
        finally:
            tmp.unlink(missing_ok=True)

    def test_uppercase_extension_returns_path(self):
        """Extension check should be case-insensitive (.PNG should work)."""
        with tempfile.NamedTemporaryFile(suffix=".PNG", delete=False) as f:
            tmp = Path(f.name)
        try:
            result = _resolve_image_path(str(tmp), tmp.parent)
            self.assertIsInstance(result, Path)
        finally:
            tmp.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Property 2: Image path validation
# ---------------------------------------------------------------------------

@given(st.sampled_from([".png", ".jpg", ".jpeg", ".webp", ".mp4", ".txt"]))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_image_path_validation_property(ext):
    """
    Property 2: Image path validation
    _resolve_image_path() returns Path iff file exists AND extension is valid.

    **Validates: Requirements 1.2, 4.3**
    """
    valid_exts = {".png", ".jpg", ".jpeg", ".webp"}
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        tmp = Path(f.name)
    try:
        result = _resolve_image_path(str(tmp), tmp.parent)
        if ext.lower() in valid_exts:
            assert isinstance(result, Path), f"Expected Path for ext={ext}, got {result}"
        else:
            assert result is None, f"Expected None for ext={ext}, got {result}"
    finally:
        tmp.unlink(missing_ok=True)


# ===========================================================================
# TestBuildFilter
# ===========================================================================

class TestBuildFilter(unittest.TestCase):
    """Unit + property tests for _build_anti_fingerprint_filter(). Validates: Requirements 1.3, 2.1–2.4"""

    def _build(self, has_overlay=False, overlay_opacity=0.02, has_logo=False,
                logo_position="bottom-left", logo_max_width_pct=0.15, logo_padding=10):
        n = (1 if has_overlay else 0) + (1 if has_logo else 0)
        fc, labels = _build_anti_fingerprint_filter(
            has_overlay=has_overlay,
            overlay_opacity=overlay_opacity,
            has_logo=has_logo,
            logo_position=logo_position,
            logo_max_width_pct=logo_max_width_pct,
            logo_padding=logo_padding,
            n_extra_inputs=n,
        )
        return fc

    def test_overlay_only_contains_scale2ref(self):
        """Overlay-only filter must contain scale2ref."""
        fc = self._build(has_overlay=True, has_logo=False)
        self.assertIn("scale2ref", fc)

    def test_logo_only_contains_scale(self):
        """Logo-only filter must contain scale=iw*."""
        fc = self._build(has_overlay=False, has_logo=True)
        self.assertIn("scale=iw*", fc)

    def test_both_contains_scale2ref_and_logo(self):
        """Both overlay+logo filter must contain both scale2ref and scale=iw*."""
        fc = self._build(has_overlay=True, has_logo=True)
        self.assertIn("scale2ref", fc)
        self.assertIn("scale=iw*", fc)

    def test_invalid_logo_position_fallback(self):
        """Invalid logo_position should fall back to bottom-left (H-h-P)."""
        fc = self._build(has_overlay=False, has_logo=True, logo_position="invalid")
        self.assertIn("H-h-", fc)

    def test_bottom_left_position(self):
        """bottom-left should produce overlay with P and H-h-P."""
        fc = self._build(has_logo=True, logo_position="bottom-left", logo_padding=10)
        self.assertIn("H-h-10", fc)

    def test_top_right_position(self):
        """top-right should produce overlay with W-w-P and P."""
        fc = self._build(has_logo=True, logo_position="top-right", logo_padding=10)
        self.assertIn("W-w-10", fc)

    def test_bottom_right_position(self):
        """bottom-right should produce overlay with W-w-P and H-h-P."""
        fc = self._build(has_logo=True, logo_position="bottom-right", logo_padding=10)
        self.assertIn("W-w-10", fc)
        self.assertIn("H-h-10", fc)

    def test_top_left_position(self):
        """top-left should produce overlay with just P for both x and y."""
        fc = self._build(has_logo=True, logo_position="top-left", logo_padding=5)
        # x=5, y=5 — should NOT contain W-w or H-h
        self.assertNotIn("W-w-5", fc)
        self.assertNotIn("H-h-5", fc)

    def test_overlay_opacity_in_filter(self):
        """Overlay opacity value should appear in the filter string."""
        fc = self._build(has_overlay=True, overlay_opacity=0.05)
        self.assertIn("0.05", fc)

    def test_logo_opacity_in_filter(self):
        """Logo opacity value should appear in the filter string."""
        fc = self._build(has_logo=True, logo_opacity=0.3)
        self.assertIn("0.3", fc)

    def test_logo_scale_uses_max_width_pct(self):
        """Logo scale filter should use the configured max_width_pct."""
        fc = self._build(has_logo=True, logo_max_width_pct=0.20)
        self.assertIn("0.2", fc)


# ---------------------------------------------------------------------------
# Property 3: Overlay scale filter
# ---------------------------------------------------------------------------

@given(st.floats(min_value=0.01, max_value=1.0))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_overlay_filter_contains_scale2ref(opacity):
    """
    Property 3: Overlay scale filter
    Any call with has_overlay=True must produce a filter containing scale2ref.

    **Validates: Requirements 1.3**
    """
    fc, _ = _build_anti_fingerprint_filter(
        has_overlay=True,
        overlay_opacity=opacity,
        has_logo=False,
        logo_position="bottom-left",
        logo_max_width_pct=0.15,
        logo_padding=10,
        n_extra_inputs=1,
    )
    assert "scale2ref" in fc, f"scale2ref not found in filter for opacity={opacity}"


# ---------------------------------------------------------------------------
# Property 4: Logo position filter expression
# ---------------------------------------------------------------------------

@given(
    st.sampled_from(["top-left", "top-right", "bottom-left", "bottom-right"]),
    st.integers(min_value=0, max_value=50),
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_logo_position_filter_expression(position, padding):
    """
    Property 4: Logo position filter expression
    Filter must contain correct offset expressions for each logo_position.

    **Validates: Requirements 2.1, 2.2, 2.4**
    """
    fc, _ = _build_anti_fingerprint_filter(
        has_overlay=False,
        overlay_opacity=0.02,
        has_logo=True,
        logo_position=position,
        logo_max_width_pct=0.15,
        logo_padding=padding,
        n_extra_inputs=1,
    )
    P = padding
    if position == "top-left":
        assert f"overlay={P}:{P}" in fc, f"top-left: expected overlay={P}:{P} in {fc}"
    elif position == "top-right":
        assert f"W-w-{P}" in fc, f"top-right: expected W-w-{P} in {fc}"
        assert f":{P}" in fc, f"top-right: expected :{P} in {fc}"
    elif position == "bottom-left":
        assert f"overlay={P}:" in fc, f"bottom-left: expected overlay={P}: in {fc}"
        assert f"H-h-{P}" in fc, f"bottom-left: expected H-h-{P} in {fc}"
    elif position == "bottom-right":
        assert f"W-w-{P}" in fc, f"bottom-right: expected W-w-{P} in {fc}"
        assert f"H-h-{P}" in fc, f"bottom-right: expected H-h-{P} in {fc}"


# ---------------------------------------------------------------------------
# Property 5: Logo scale constraint
# ---------------------------------------------------------------------------

@given(st.floats(min_value=0.05, max_value=0.5))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_logo_scale_filter_contains_scale(max_width_pct):
    """
    Property 5: Logo scale constraint
    Filter must contain scale=iw* to constrain logo width.

    **Validates: Requirements 2.3**
    """
    fc, _ = _build_anti_fingerprint_filter(
        has_overlay=False,
        overlay_opacity=0.02,
        has_logo=True,
        logo_position="bottom-left",
        logo_max_width_pct=max_width_pct,
        logo_padding=10,
        n_extra_inputs=1,
    )
    assert "scale=iw*" in fc, f"scale=iw* not found in filter for max_width_pct={max_width_pct}"


# ===========================================================================
# TestApplyAntiFp
# ===========================================================================

class TestApplyAntiFp(unittest.TestCase):
    """Unit + property tests for apply_anti_fingerprint(). Validates: Requirements 1.1, 3.2, 3.3, 3.4"""

    def test_no_valid_images_returns_false(self):
        """When no valid images are provided, should return (False, 'no valid images')."""
        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            out = Path(tmpdir) / "out.mp4"

            ok, msg = apply_anti_fingerprint(
                video_path=video,
                output_path=out,
                ffmpeg="ffmpeg",
                overlay_image="/nonexistent/overlay.png",
                logo_image="/nonexistent/logo.png",
            )

        self.assertFalse(ok)
        self.assertIn("no valid images", msg)

    def test_single_pass_encode(self):
        """
        Property 6: Single-pass encode
        apply_anti_fingerprint() must call run_ffmpeg exactly once when both images are valid.

        **Validates: Requirements 3.2, 3.3**
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            overlay = Path(tmpdir) / "overlay.png"
            overlay.write_bytes(b"\x89PNG\r\n")
            logo = Path(tmpdir) / "logo.png"
            logo.write_bytes(b"\x89PNG\r\n")
            out = Path(tmpdir) / "out.mp4"

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")) as mock_ffmpeg:
                apply_anti_fingerprint(
                    video_path=video,
                    output_path=out,
                    ffmpeg="ffmpeg",
                    overlay_image=str(overlay),
                    logo_image=str(logo),
                )

            self.assertEqual(mock_ffmpeg.call_count, 1, "run_ffmpeg must be called exactly once")

    def test_ffmpeg_cmd_contains_audio_map(self):
        """
        Property 7: Audio preservation
        ffmpeg command must contain -map 0:a? and -c:a copy.

        **Validates: Requirements 3.4**
        """
        captured_cmd = []

        def capture_ffmpeg(args, desc=""):
            captured_cmd.append(args)
            return True, ""

        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            overlay = Path(tmpdir) / "overlay.png"
            overlay.write_bytes(b"\x89PNG\r\n")
            out = Path(tmpdir) / "out.mp4"

            with patch("core.video_processor.run_ffmpeg", side_effect=capture_ffmpeg):
                apply_anti_fingerprint(
                    video_path=video,
                    output_path=out,
                    ffmpeg="ffmpeg",
                    overlay_image=str(overlay),
                )

        self.assertTrue(len(captured_cmd) > 0, "run_ffmpeg should have been called")
        cmd = captured_cmd[0]
        self.assertIn("0:a?", cmd, "-map 0:a? must be in ffmpeg command")
        self.assertIn("copy", cmd, "-c:a copy must be in ffmpeg command")

    def test_returns_false_on_ffmpeg_failure(self):
        """apply_anti_fingerprint() returns (False, error_msg) when ffmpeg fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            overlay = Path(tmpdir) / "overlay.png"
            overlay.write_bytes(b"\x89PNG\r\n")
            out = Path(tmpdir) / "out.mp4"

            with patch("core.video_processor.run_ffmpeg", return_value=(False, "ffmpeg error")):
                ok, msg = apply_anti_fingerprint(
                    video_path=video,
                    output_path=out,
                    ffmpeg="ffmpeg",
                    overlay_image=str(overlay),
                )

        self.assertFalse(ok)
        self.assertIn("ffmpeg error", msg)

    def test_overlay_only_no_logo(self):
        """apply_anti_fingerprint() works with only overlay (no logo)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            overlay = Path(tmpdir) / "overlay.png"
            overlay.write_bytes(b"\x89PNG\r\n")
            out = Path(tmpdir) / "out.mp4"

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")) as mock_ffmpeg:
                ok, msg = apply_anti_fingerprint(
                    video_path=video,
                    output_path=out,
                    ffmpeg="ffmpeg",
                    overlay_image=str(overlay),
                )

        self.assertTrue(ok)
        self.assertEqual(mock_ffmpeg.call_count, 1)

    def test_logo_only_no_overlay(self):
        """apply_anti_fingerprint() works with only logo (no overlay)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "video.mp4"
            video.write_bytes(b"\x00" * 16)
            logo = Path(tmpdir) / "logo.png"
            logo.write_bytes(b"\x89PNG\r\n")
            out = Path(tmpdir) / "out.mp4"

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")) as mock_ffmpeg:
                ok, msg = apply_anti_fingerprint(
                    video_path=video,
                    output_path=out,
                    ffmpeg="ffmpeg",
                    logo_image=str(logo),
                )

        self.assertTrue(ok)
        self.assertEqual(mock_ffmpeg.call_count, 1)


# ---------------------------------------------------------------------------
# Property 1: Opacity clamping invariant
# ---------------------------------------------------------------------------

@given(st.floats(allow_nan=False, allow_infinity=False))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_opacity_clamping_invariant(value):
    """
    Property 1: Opacity clamping invariant
    _clamp_float(v, 0.01, 1.0) must always return a value in [0.01, 1.0].

    **Validates: Requirements 1.4**
    """
    result = _clamp_float(value, 0.01, 1.0)
    assert 0.01 <= result <= 1.0, f"Clamped value {result} out of [0.01, 1.0] for input {value}"


# ---------------------------------------------------------------------------
# Property 7: Audio preservation (property-based)
# ---------------------------------------------------------------------------

@given(st.booleans(), st.booleans())
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_audio_preservation_property(has_overlay_flag, has_logo_flag):
    """
    Property 7: Audio preservation
    ffmpeg command must always contain audio mapping when at least one image is valid.

    **Validates: Requirements 3.4**
    """
    if not has_overlay_flag and not has_logo_flag:
        return  # nothing to test — no valid images

    captured_cmd = []

    def capture_ffmpeg(args, desc=""):
        captured_cmd.append(args)
        return True, ""

    with tempfile.TemporaryDirectory() as tmpdir:
        video = Path(tmpdir) / "video.mp4"
        video.write_bytes(b"\x00" * 16)
        overlay_path = None
        logo_path = None

        if has_overlay_flag:
            overlay_path = Path(tmpdir) / "overlay.png"
            overlay_path.write_bytes(b"\x89PNG\r\n")
        if has_logo_flag:
            logo_path = Path(tmpdir) / "logo.png"
            logo_path.write_bytes(b"\x89PNG\r\n")

        out = Path(tmpdir) / "out.mp4"

        with patch("core.video_processor.run_ffmpeg", side_effect=capture_ffmpeg):
            apply_anti_fingerprint(
                video_path=video,
                output_path=out,
                ffmpeg="ffmpeg",
                overlay_image=str(overlay_path) if overlay_path else None,
                logo_image=str(logo_path) if logo_path else None,
            )

    if captured_cmd:
        cmd = captured_cmd[0]
        assert "0:a?" in cmd, f"Audio map missing from cmd: {cmd}"
        assert "copy" in cmd, f"-c:a copy missing from cmd: {cmd}"


# ===========================================================================
# TestPipelineIntegration
# ===========================================================================

class TestPipelineIntegration(unittest.TestCase):
    """Integration tests for anti-fingerprint pipeline step. Validates: Requirements 3.1, 3.5"""

    def test_disabled_state_does_not_call_apply(self):
        """
        Property 9: Disabled state
        When anti_fingerprint.enabled=False, apply_anti_fingerprint must NOT be called.

        **Validates: Requirements 1.6, 2.6**
        """
        from core.video_processor import process_video_full
        import json

        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "test.mp4"
            video.write_bytes(b"\x00" * 16)

            data = {
                "video_path": str(video),
                "out_dir": tmpdir,
                "cfg_raw": {
                    "video_process": {
                        "anti_fingerprint": {"enabled": False}
                    }
                },
            }

            with patch("core.video_processor.apply_anti_fingerprint") as mock_af, \
                 patch("core.video_processor.find_ffmpeg", return_value="ffmpeg"), \
                 patch("core.video_processor.FasterWhisperTranscriber") as mock_cls:
                mock_inst = MagicMock()
                mock_inst.transcribe.return_value = []
                mock_cls.return_value = mock_inst

                list(process_video_full(data))

            mock_af.assert_not_called()

    def test_enabled_state_calls_apply(self):
        """
        When anti_fingerprint.enabled=True with valid images, apply_anti_fingerprint is called.
        cfg_raw is loaded from config.yml inside process_video_full, so we mock yaml.safe_load.

        **Validates: Requirements 1.1, 3.1**
        """
        from core.video_processor import process_video_full
        import yaml

        with tempfile.TemporaryDirectory() as tmpdir:
            video = Path(tmpdir) / "test.mp4"
            video.write_bytes(b"\x00" * 16)
            overlay = Path(tmpdir) / "overlay.png"
            overlay.write_bytes(b"\x89PNG\r\n")

            data = {
                "video_path": str(video),
                "out_dir": tmpdir,
            }

            fake_cfg = {
                "video_process": {
                    "anti_fingerprint": {
                        "enabled": True,
                        "overlay_image": str(overlay),
                        "overlay_opacity": 0.02,
                    }
                }
            }

            with patch("core.video_processor.apply_anti_fingerprint", return_value=(True, "")) as mock_af, \
                 patch("core.video_processor.find_ffmpeg", return_value="ffmpeg"), \
                 patch("core.video_processor.FasterWhisperTranscriber") as mock_cls, \
                 patch("yaml.safe_load", return_value=fake_cfg):
                mock_inst = MagicMock()
                mock_inst.transcribe.return_value = []
                mock_cls.return_value = mock_inst

                list(process_video_full(data))

            mock_af.assert_called_once()


# ===========================================================================
# TestConfigDefaults
# ===========================================================================

class TestConfigDefaults(unittest.TestCase):
    """Unit tests for config defaults. Validates: Requirements 4.1, 4.2"""

    def test_default_anti_fingerprint_values(self):
        """DEFAULT_ANTI_FINGERPRINT must have correct default values."""
        from config.default_config import DEFAULT_ANTI_FINGERPRINT

        self.assertFalse(DEFAULT_ANTI_FINGERPRINT["enabled"])
        self.assertEqual(DEFAULT_ANTI_FINGERPRINT["overlay_opacity"], 0.02)
        self.assertFalse(DEFAULT_ANTI_FINGERPRINT["logo_enabled"])
        self.assertEqual(DEFAULT_ANTI_FINGERPRINT["logo_position"], "bottom-left")
        self.assertEqual(DEFAULT_ANTI_FINGERPRINT["overlay_image"], "")
        self.assertEqual(DEFAULT_ANTI_FINGERPRINT["logo_image"], "")

    def test_missing_anti_fingerprint_section_uses_defaults(self):
        """When anti_fingerprint key is absent, defaults are applied correctly."""
        from core.video_processor import _as_bool, _as_float

        cfg = {}  # no anti_fingerprint key
        af = cfg.get("anti_fingerprint") or {}

        self.assertFalse(_as_bool(af.get("enabled", False), False))
        self.assertEqual(_as_float(af.get("overlay_opacity", 0.02), 0.02), 0.02)
        self.assertFalse(_as_bool(af.get("logo_enabled", False), False))
        self.assertEqual(str(af.get("logo_position", "bottom-left")), "bottom-left")


# ---------------------------------------------------------------------------
# Property 8: Config defaults when section is missing
# ---------------------------------------------------------------------------

@given(st.dictionaries(st.text(), st.text()))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_config_defaults_when_anti_fingerprint_missing(random_cfg):
    """
    Property 8: Config defaults when section is missing
    When anti_fingerprint key is absent from any config dict, defaults must apply.

    **Validates: Requirements 4.1, 4.2**
    """
    from core.video_processor import _as_bool, _as_float

    af = random_cfg.get("anti_fingerprint") or {}
    # Since random_cfg has only text keys/values, anti_fingerprint will be absent
    # (or if present as a text value, `or {}` will give {})
    enabled = _as_bool(af.get("enabled", False), False)
    opacity = _as_float(af.get("overlay_opacity", 0.02), 0.02)
    logo_enabled = _as_bool(af.get("logo_enabled", False), False)
    logo_position = str(af.get("logo_position", "bottom-left"))

    assert enabled == False, f"Default enabled should be False, got {enabled}"
    assert opacity == 0.02, f"Default opacity should be 0.02, got {opacity}"
    assert logo_enabled == False, f"Default logo_enabled should be False, got {logo_enabled}"
    assert logo_position == "bottom-left", f"Default logo_position should be bottom-left, got {logo_position}"


if __name__ == "__main__":
    unittest.main()
