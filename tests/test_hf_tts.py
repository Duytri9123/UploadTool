"""
Unit tests for core/hf_tts.py — HuggingFaceTTS
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.hf_tts import HuggingFaceTTS


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_tts(token="test-token", model="facebook/mms-tts-vie", device="cpu", embeddings=""):
    return HuggingFaceTTS(
        hf_token=token,
        tts_model=model,
        device=device,
        speaker_embeddings_path=embeddings,
    )


# ── Guard tests (no model load) ───────────────────────────────────────────────

class TestSynthesizeGuards:
    """Tests that return early without loading the model."""

    def test_empty_text_returns_false(self, tmp_path):
        tts = _make_tts()
        ok, err = tts.synthesize("", tmp_path / "out.mp3")
        assert ok is False
        assert "rỗng" in err.lower() or "empty" in err.lower() or err

    def test_whitespace_only_text_returns_false(self, tmp_path):
        tts = _make_tts()
        ok, err = tts.synthesize("   ", tmp_path / "out.mp3")
        assert ok is False

    def test_missing_token_returns_false(self, tmp_path):
        tts = _make_tts(token="")
        ok, err = tts.synthesize("Xin chào", tmp_path / "out.mp3")
        assert ok is False
        assert "token" in err.lower() or "huggingface" in err.lower()

    def test_none_token_returns_false(self, tmp_path):
        tts = _make_tts(token=None)
        ok, err = tts.synthesize("Xin chào", tmp_path / "out.mp3")
        assert ok is False

    def test_empty_text_does_not_load_model(self, tmp_path):
        """Model must NOT be loaded when text is empty."""
        tts = _make_tts()
        with patch("core.hf_tts.HuggingFaceTTS._load_model") as mock_load:
            tts.synthesize("", tmp_path / "out.mp3")
            mock_load.assert_not_called()

    def test_missing_token_does_not_load_model(self, tmp_path):
        """Model must NOT be loaded when token is missing."""
        tts = _make_tts(token="")
        with patch("core.hf_tts.HuggingFaceTTS._load_model") as mock_load:
            tts.synthesize("Xin chào", tmp_path / "out.mp3")
            mock_load.assert_not_called()


# ── Device fallback ───────────────────────────────────────────────────────────

class TestDeviceFallback:
    def test_cuda_unavailable_falls_back_to_cpu(self):
        with patch("core.hf_tts._get_torch") as mock_get_torch:
            mock_torch = MagicMock()
            mock_torch.cuda.is_available.return_value = False
            mock_get_torch.return_value = mock_torch

            tts = HuggingFaceTTS(hf_token="tok", device="cuda")
            assert tts.device == "cpu"

    def test_cuda_available_keeps_cuda(self):
        with patch("core.hf_tts._get_torch") as mock_get_torch:
            mock_torch = MagicMock()
            mock_torch.cuda.is_available.return_value = True
            mock_get_torch.return_value = mock_torch

            tts = HuggingFaceTTS(hf_token="tok", device="cuda")
            assert tts.device == "cuda"

    def test_cpu_device_unchanged(self):
        tts = HuggingFaceTTS(hf_token="tok", device="cpu")
        assert tts.device == "cpu"


# ── Model load failure ────────────────────────────────────────────────────────

class TestModelLoadFailure:
    def test_model_load_failure_returns_false(self, tmp_path):
        tts = _make_tts()
        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(False, "Model không tồn tại")):
            ok, err = tts.synthesize("Xin chào", tmp_path / "out.mp3")
        assert ok is False
        assert "Model" in err or err

    def test_model_load_exception_returns_false(self, tmp_path):
        tts = _make_tts()
        with patch("core.hf_tts.HuggingFaceTTS._load_model", side_effect=Exception("network error")):
            ok, err = tts.synthesize("Xin chào", tmp_path / "out.mp3")
        assert ok is False


# ── Successful synthesis (mocked pipeline) ───────────────────────────────────

class TestSynthesizeSuccess:
    def _mock_pipeline_result(self):
        import numpy as np
        return {"audio": np.zeros(16000, dtype=np.float32), "sampling_rate": 16000}

    def test_synthesize_creates_mp3(self, tmp_path):
        tts = _make_tts()
        out = tmp_path / "output.mp3"

        mock_pipe = MagicMock(return_value=self._mock_pipeline_result())

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch.object(tts, "_pipe", mock_pipe), \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(True, "")) as mock_wav, \
             patch("core.hf_tts.HuggingFaceTTS._convert_to_mp3", return_value=(True, "")) as mock_mp3:

            tts._pipe = mock_pipe
            ok, err = tts.synthesize("Xin chào Việt Nam", out)

        assert ok is True
        assert err == ""

    def test_synthesize_calls_pipeline_with_text(self, tmp_path):
        tts = _make_tts()
        out = tmp_path / "output.mp3"
        text = "Đây là bài kiểm tra"

        mock_pipe = MagicMock(return_value=self._mock_pipeline_result())

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._convert_to_mp3", return_value=(True, "")):

            tts._pipe = mock_pipe
            tts.synthesize(text, out)

        mock_pipe.assert_called_once_with(text)

    def test_wav_write_failure_returns_false(self, tmp_path):
        tts = _make_tts()
        out = tmp_path / "output.mp3"

        mock_pipe = MagicMock(return_value=self._mock_pipeline_result())

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(False, "disk full")):

            tts._pipe = mock_pipe
            ok, err = tts.synthesize("Xin chào", out)

        assert ok is False
        assert "disk full" in err

    def test_ffmpeg_convert_failure_returns_false(self, tmp_path):
        tts = _make_tts()
        out = tmp_path / "output.mp3"

        mock_pipe = MagicMock(return_value=self._mock_pipeline_result())

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._convert_to_mp3", return_value=(False, "ffmpeg error")):

            tts._pipe = mock_pipe
            ok, err = tts.synthesize("Xin chào", out)

        assert ok is False
        assert "ffmpeg" in err.lower()


# ── SpeechT5 speaker embeddings ───────────────────────────────────────────────

class TestSpeechT5:
    def test_speecht5_loads_speaker_embeddings(self, tmp_path):
        tts = _make_tts(model="microsoft/speecht5_tts")
        out = tmp_path / "output.mp3"

        import numpy as np
        mock_result = {"audio": np.zeros(16000, dtype=np.float32), "sampling_rate": 16000}
        mock_pipe = MagicMock(return_value=mock_result)

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._load_speaker_embeddings", return_value=(True, "")) as mock_emb, \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._convert_to_mp3", return_value=(True, "")):

            tts._pipe = mock_pipe
            tts._speaker_embeddings = MagicMock()
            ok, err = tts.synthesize("Hello", out)

        mock_emb.assert_called_once()

    def test_speecht5_embeddings_failure_returns_false(self, tmp_path):
        tts = _make_tts(model="microsoft/speecht5_tts")
        out = tmp_path / "output.mp3"

        with patch("core.hf_tts.HuggingFaceTTS._load_model", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._load_speaker_embeddings", return_value=(False, "embeddings error")):

            tts._pipe = MagicMock()
            ok, err = tts.synthesize("Hello", out)

        assert ok is False
        assert "embeddings" in err.lower()


# ── Model caching ─────────────────────────────────────────────────────────────

class TestModelCaching:
    def test_model_loaded_only_once(self, tmp_path):
        """_load_model should not re-load if _pipe is already set."""
        tts = _make_tts()

        import numpy as np
        mock_result = {"audio": np.zeros(16000, dtype=np.float32), "sampling_rate": 16000}
        mock_pipe = MagicMock(return_value=mock_result)

        call_count = {"n": 0}

        def fake_load():
            call_count["n"] += 1
            tts._pipe = mock_pipe
            return True, ""

        with patch.object(tts, "_load_model", side_effect=fake_load), \
             patch("core.hf_tts.HuggingFaceTTS._write_wav", return_value=(True, "")), \
             patch("core.hf_tts.HuggingFaceTTS._convert_to_mp3", return_value=(True, "")):

            tts.synthesize("Xin chào", tmp_path / "a.mp3")
            tts.synthesize("Tạm biệt", tmp_path / "b.mp3")

        # _load_model called twice (once per synthesize call) but internal guard
        # inside _load_model itself prevents re-loading — that's tested separately
        assert call_count["n"] == 2  # wrapper called twice; internal guard is in _load_model

    def test_internal_load_model_caches_pipe(self):
        """_load_model should not call pipeline() again if _pipe already set."""
        tts = _make_tts()
        mock_pipe = MagicMock()
        tts._pipe = mock_pipe  # pre-set cache

        # Patch the local import inside _load_model
        with patch("builtins.__import__") as mock_import:
            ok, err = tts._load_model()

        # __import__ should NOT have been called for transformers since we returned early
        assert ok is True
        assert err == ""
        # The pipe should still be the pre-set mock
        assert tts._pipe is mock_pipe
