"""
Property-based tests for BatchTranslator.

**Validates: Requirements 2.3, 2.4**
"""

import json
import tempfile
import os
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from hypothesis import given, settings, HealthCheck
import hypothesis.strategies as st

from utils.translation import BatchTranslator


# ---------------------------------------------------------------------------
# Strategy: arbitrary list of strings (non-empty strings to avoid filtering)
# ---------------------------------------------------------------------------

text_list = st.lists(
    st.text(min_size=1, max_size=200),
    min_size=1,
    max_size=30,
)


# ---------------------------------------------------------------------------
# Property 2: Output length preservation
# ---------------------------------------------------------------------------

@given(texts=text_list)
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_output_length_preservation(texts):
    """
    Property 2: Output length preservation
    len(output) == len(input) for any input list, even when all providers fail.

    **Validates: Requirements 2.4**
    """
    translator = BatchTranslator({})  # no API keys → only google provider

    # Patch urllib.request.urlopen to simulate all providers failing
    with patch("utils.translation.urllib.request.urlopen", side_effect=Exception("network error")):
        result, provider = translator.translate(texts)

    assert len(result) == len(texts), (
        f"Expected output length {len(texts)}, got {len(result)}"
    )


# ---------------------------------------------------------------------------
# Property 3: Fallback identity
# ---------------------------------------------------------------------------

@given(texts=text_list)
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_fallback_identity(texts):
    """
    Property 3: Fallback identity
    When all providers fail, output[i] == input[i] for all i.

    **Validates: Requirements 2.3**
    """
    translator = BatchTranslator({})  # no API keys → only google provider

    # Patch urllib.request.urlopen to simulate all providers failing
    with patch("utils.translation.urllib.request.urlopen", side_effect=Exception("network error")):
        result, provider = translator.translate(texts)

    assert provider == "fallback", f"Expected provider 'fallback', got '{provider}'"
    for i, (original, translated) in enumerate(zip(texts, result)):
        assert translated == original, (
            f"At index {i}: expected '{original}', got '{translated}'"
        )


# ---------------------------------------------------------------------------
# Unit tests (non-property-based)
# ---------------------------------------------------------------------------


class TestFallbackChainOrder(unittest.TestCase):
    """Test that the fallback chain is tried in order: deepseek → openai → huggingface → google."""

    def test_fallback_chain_order(self):
        """Mock providers to fail in sequence; verify google is used as final fallback."""
        trans_cfg = {
            "deepseek_key": "dk-fake",
            "openai_key": "sk-fake",
            "hf_token": "hf-fake",
        }
        translator = BatchTranslator(trans_cfg)

        call_log = []

        def fake_urlopen(req, timeout=None):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            call_log.append(url)
            # Fail deepseek and openai and huggingface; succeed for google
            if "deepseek.com" in url or "openai.com" in url or "huggingface.co" in url:
                raise Exception("provider down")
            # Google translate — return a minimal valid response
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps(
                {"sentences": [{"trans": "Xin chào"}]}
            ).encode()
            mock_resp.__enter__ = lambda s: s
            mock_resp.__exit__ = MagicMock(return_value=False)
            return mock_resp

        with patch("utils.translation.urllib.request.urlopen", side_effect=fake_urlopen):
            result, provider = translator.translate(["你好"])

        assert provider == "google", f"Expected 'google', got '{provider}'"
        assert len(result) == 1

    def test_preferred_provider_used_first(self):
        """Configure trans_cfg with deepseek_key and openai_key; set preferred_provider='openai'.
        Verify openai is tried first (before deepseek)."""
        trans_cfg = {
            "deepseek_key": "dk-fake",
            "openai_key": "sk-fake",
        }
        translator = BatchTranslator(trans_cfg)

        call_log = []

        def fake_urlopen(req, timeout=None):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            call_log.append(url)
            # openai succeeds
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps(
                {
                    "choices": [
                        {"message": {"content": "1. Xin chào"}}
                    ]
                }
            ).encode()
            mock_resp.__enter__ = lambda s: s
            mock_resp.__exit__ = MagicMock(return_value=False)
            return mock_resp

        with patch("utils.translation.urllib.request.urlopen", side_effect=fake_urlopen):
            result, provider = translator.translate(["你好"], preferred_provider="openai")

        assert provider == "openai", f"Expected 'openai', got '{provider}'"
        # The first URL called should be openai, not deepseek
        assert call_log, "No network calls were made"
        assert "openai.com" in call_log[0], (
            f"Expected openai to be tried first, but first call was: {call_log[0]}"
        )


class TestOutputOrderPreserved(unittest.TestCase):
    def test_output_order_preserved(self):
        """Provide 3 texts; mock google to return 3 translations; verify order."""
        translator = BatchTranslator({})

        responses = [
            {"sentences": [{"trans": "X"}]},
            {"sentences": [{"trans": "Y"}]},
            {"sentences": [{"trans": "Z"}]},
        ]
        response_iter = iter(responses)

        def fake_urlopen(req, timeout=None):
            data = next(response_iter)
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps(data).encode()
            mock_resp.__enter__ = lambda s: s
            mock_resp.__exit__ = MagicMock(return_value=False)
            return mock_resp

        with patch("utils.translation.urllib.request.urlopen", side_effect=fake_urlopen):
            result, provider = translator.translate(["A", "B", "C"])

        assert result[0] == "X", f"Expected 'X', got '{result[0]}'"
        assert result[1] == "Y", f"Expected 'Y', got '{result[1]}'"
        assert result[2] == "Z", f"Expected 'Z', got '{result[2]}'"


class TestEmptyInput(unittest.TestCase):
    def test_empty_input_returns_empty(self):
        """Call translate([]) and verify result is ([], 'none') or ([], ...)."""
        translator = BatchTranslator({})
        result, provider = translator.translate([])
        assert result == [], f"Expected empty list, got {result}"
        assert provider == "none", f"Expected provider 'none', got '{provider}'"


class TestWriteViSrt(unittest.TestCase):
    def test_write_vi_srt_creates_file(self):
        """Create a BatchTranslator, call write_vi_srt with 2 segments and 2 translations,
        verify the SRT file is created with correct content."""
        translator = BatchTranslator({})
        segments = [
            {"start": 0.0, "end": 2.5},
            {"start": 3.0, "end": 5.0},
        ]
        translations = ["Xin chào", "Tạm biệt"]

        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / "output.srt"
            translator.write_vi_srt(segments, translations, out_path)

            assert out_path.exists(), "SRT file was not created"
            content = out_path.read_text(encoding="utf-8")

            # Check sequence numbers
            assert "1\n" in content, "Missing sequence number 1"
            assert "2\n" in content, "Missing sequence number 2"

            # Check timestamps
            assert "00:00:00,000 --> 00:00:02,500" in content
            assert "00:00:03,000 --> 00:00:05,000" in content

            # Check translated text
            assert "Xin chào" in content
            assert "Tạm biệt" in content


if __name__ == "__main__":
    unittest.main()
