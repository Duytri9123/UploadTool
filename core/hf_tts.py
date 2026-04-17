"""
hf_tts.py — HuggingFace TTS engine.

Hỗ trợ:
  - facebook/mms-tts-vie  (Vietnamese, không cần speaker embeddings)
  - microsoft/speecht5_tts (cần speaker embeddings)

Yêu cầu:
  pip install transformers torch datasets scipy
  ffmpeg phải có trong PATH (để convert WAV → MP3)
"""
import logging
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy imports — chỉ import khi cần để tránh lỗi nếu chưa cài
_pipeline = None
_torch = None


def _get_torch():
    global _torch
    if _torch is None:
        import torch  # noqa: PLC0415
        _torch = torch
    return _torch


class HuggingFaceTTS:
    """TTS engine dùng HuggingFace transformers pipeline."""

    def __init__(
        self,
        hf_token: str,
        tts_model: str = "facebook/mms-tts-vie",
        device: str = "cpu",
        speaker_embeddings_path: str = "",
    ):
        self.hf_token = hf_token.strip() if hf_token else ""
        self.tts_model = tts_model or "facebook/mms-tts-vie"
        self.speaker_embeddings_path = speaker_embeddings_path or ""

        # Resolve device — fallback sang cpu nếu CUDA không khả dụng
        requested_device = (device or "cpu").lower()
        if requested_device == "cuda":
            try:
                torch = _get_torch()
                if not torch.cuda.is_available():
                    logger.warning(
                        "HuggingFaceTTS: device='cuda' được yêu cầu nhưng CUDA không khả dụng. "
                        "Fallback sang 'cpu'."
                    )
                    requested_device = "cpu"
            except Exception:
                logger.warning(
                    "HuggingFaceTTS: Không thể kiểm tra CUDA (torch chưa cài?). Fallback sang 'cpu'."
                )
                requested_device = "cpu"
        self.device = requested_device

        # Cache model trong memory
        self._pipe = None
        self._speaker_embeddings = None

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _is_mms(self) -> bool:
        return "mms-tts" in self.tts_model.lower()

    def _load_model(self) -> tuple[bool, str]:
        """Lazy-load và cache model. Returns (ok, error)."""
        if self._pipe is not None:
            return True, ""

        try:
            logger.info("HuggingFaceTTS: Loading model '%s' on device '%s'…", self.tts_model, self.device)

            if self._is_mms():
                # Dùng VitsModel trực tiếp — tránh speechbrain dependency
                from transformers import VitsModel, AutoTokenizer  # noqa: PLC0415
                import torch  # noqa: PLC0415
                tokenizer = AutoTokenizer.from_pretrained(
                    self.tts_model, token=self.hf_token or None
                )
                model = VitsModel.from_pretrained(
                    self.tts_model, token=self.hf_token or None
                )
                model.eval()
                # Wrap thành callable giống pipeline output
                def _mms_pipe(text):
                    inputs = tokenizer(text, return_tensors="pt")
                    with torch.no_grad():
                        output = model(**inputs)
                    audio = output.waveform[0].numpy()
                    return {"audio": audio, "sampling_rate": model.config.sampling_rate}
                self._pipe = _mms_pipe
            else:
                # SpeechT5 và các model khác dùng pipeline
                from transformers import pipeline  # noqa: PLC0415
                kwargs: dict = {
                    "task": "text-to-speech",
                    "model": self.tts_model,
                    "device": self.device,
                }
                if self.hf_token:
                    kwargs["token"] = self.hf_token
                self._pipe = pipeline(**kwargs)

            logger.info("HuggingFaceTTS: Model loaded successfully.")
            return True, ""
        except Exception as exc:
            return False, f"Không thể load model '{self.tts_model}': {exc}"

    def _load_speaker_embeddings(self) -> tuple[bool, str]:
        """Load speaker embeddings cho SpeechT5. Returns (ok, error)."""
        if self._speaker_embeddings is not None:
            return True, ""

        try:
            import torch  # noqa: PLC0415
            import numpy as np  # noqa: PLC0415

            if self.speaker_embeddings_path:
                # Load từ file local (.pt hoặc .npy)
                p = Path(self.speaker_embeddings_path)
                if not p.exists():
                    return False, f"speaker_embeddings_path không tồn tại: {p}"
                if p.suffix == ".npy":
                    arr = np.load(str(p))
                    self._speaker_embeddings = torch.tensor(arr).unsqueeze(0)
                else:
                    self._speaker_embeddings = torch.load(str(p), map_location=self.device)
            else:
                # Load từ datasets (default embeddings)
                from datasets import load_dataset  # noqa: PLC0415
                embeddings_dataset = load_dataset(
                    "Matthijs/cmu-arctic-xvectors",
                    split="validation",
                    token=self.hf_token or None,
                )
                self._speaker_embeddings = torch.tensor(
                    embeddings_dataset[7306]["xvector"]
                ).unsqueeze(0)

            return True, ""
        except Exception as exc:
            return False, f"Không thể load speaker embeddings: {exc}"

    def _is_speecht5(self) -> bool:
        return "speecht5" in self.tts_model.lower()

    # ── Public API ────────────────────────────────────────────────────────────

    def synthesize(
        self,
        text: str,
        out_path: Path,
        language: str = "vi",
    ) -> tuple[bool, str]:
        """
        Tổng hợp giọng nói từ text.

        Returns:
            (True, "")          — thành công, file MP3 đã ghi ra out_path
            (False, error_msg)  — thất bại
        """
        # Validate đầu vào trước khi load model
        if not text or not text.strip():
            return False, "Text không được rỗng"

        if not self.hf_token:
            return False, "HuggingFace token chưa được cấu hình"

        # Load model (lazy + cached)
        try:
            ok, err = self._load_model()
        except Exception as exc:
            return False, f"Lỗi khi load model: {exc}"
        if not ok:
            return False, err

        # Với SpeechT5 cần speaker embeddings (không áp dụng cho MMS)
        if self._is_speecht5() and not self._is_mms():
            ok, err = self._load_speaker_embeddings()
            if not ok:
                return False, err

        try:
            # Chạy inference
            if self._is_speecht5() and not self._is_mms():
                result = self._pipe(text, forward_params={"speaker_embeddings": self._speaker_embeddings})
            else:
                result = self._pipe(text)

            # result = {"audio": np.ndarray, "sampling_rate": int}
            audio_array = result["audio"]
            sampling_rate = result["sampling_rate"]

            # Ghi WAV tạm rồi convert sang MP3 bằng ffmpeg
            out_path = Path(out_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
                tmp_wav_path = Path(tmp_wav.name)

            ok, err = self._write_wav(audio_array, sampling_rate, tmp_wav_path)
            if not ok:
                return False, err

            ok, err = self._convert_to_mp3(tmp_wav_path, out_path)
            # Dọn file WAV tạm
            try:
                tmp_wav_path.unlink(missing_ok=True)
            except Exception:
                pass

            if not ok:
                return False, err

            return True, ""

        except Exception as exc:
            logger.exception("HuggingFaceTTS.synthesize() thất bại")
            return False, f"Lỗi khi tổng hợp giọng nói: {exc}"

    # ── Private helpers ───────────────────────────────────────────────────────

    def _write_wav(self, audio_array, sampling_rate: int, wav_path: Path) -> tuple[bool, str]:
        """Ghi numpy array ra file WAV."""
        try:
            import scipy.io.wavfile as wav  # noqa: PLC0415
            import numpy as np  # noqa: PLC0415

            # Đảm bảo array là float32 rồi convert sang int16
            arr = np.array(audio_array)
            if arr.dtype != np.int16:
                arr = (arr * 32767).clip(-32768, 32767).astype(np.int16)
            wav.write(str(wav_path), sampling_rate, arr)
            return True, ""
        except Exception as exc:
            return False, f"Không thể ghi file WAV: {exc}"

    def _convert_to_mp3(self, wav_path: Path, mp3_path: Path) -> tuple[bool, str]:
        """Convert WAV → MP3 bằng ffmpeg (dùng run_ffmpeg từ video_processor)."""
        try:
            from core.video_processor import run_ffmpeg, find_ffmpeg  # noqa: PLC0415

            ffmpeg = find_ffmpeg()
            if not ffmpeg:
                return False, "ffmpeg không tìm thấy trong PATH"

            ok, err = run_ffmpeg(
                [
                    ffmpeg,
                    "-y",
                    "-i", str(wav_path),
                    "-acodec", "libmp3lame",
                    "-q:a", "2",
                    str(mp3_path),
                ],
                "wav to mp3",
            )
            return ok, err
        except Exception as exc:
            return False, f"Lỗi convert WAV → MP3: {exc}"
