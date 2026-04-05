import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Tuple


def _normalize_provider_name(name: str) -> str:
    if not name:
        return "auto"
    normalized = str(name).strip().lower()
    if normalized in {"hf", "huggingface"}:
        return "huggingface"
    if normalized in {"deepseek", "openai", "google", "groq", "auto"}:
        return normalized
    return "auto"


def _parse_numbered_translation(content: str, size: int) -> List[str]:
    results = [""] * size
    for line in (content or "").split("\n"):
        match = re.match(r"^(\d+)[.)]\s*(.*)", line.strip())
        if not match:
            continue
        idx = int(match.group(1)) - 1
        if 0 <= idx < size:
            results[idx] = (match.group(2) or "").strip()
    return results


def _llm_translate(
    texts: List[str],
    api_url: str,
    api_key: str,
    model: str,
    timeout: int = 25,
) -> List[str]:
    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    prompt = (
        "You are a professional Vietnamese translator for Chinese social media content. "
        "Translate these Douyin video titles from Chinese to natural Vietnamese. "
        "Rules: 第X集->Tập X, preserve names/hashtags, keep it short. "
        "Return ONLY the numbered list, no explanations.\\n\\n" + numbered
    )
    payload = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 2000,
        }
    ).encode()
    req = urllib.request.Request(
        api_url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        data = json.loads(response.read())
    content = data["choices"][0]["message"]["content"].strip()
    return _parse_numbered_translation(content, len(texts))


def get_translation_providers(trans_cfg: Dict) -> List[str]:
    providers = []
    if (trans_cfg or {}).get("deepseek_key"):
        providers.append("deepseek")
    if (trans_cfg or {}).get("groq_key"):
        providers.append("groq")
    if (trans_cfg or {}).get("openai_key"):
        providers.append("openai")
    if (trans_cfg or {}).get("hf_token"):
        providers.append("huggingface")
    providers.append("google")
    return providers


def build_provider_order(trans_cfg: Dict, preferred_provider: str = "auto") -> List[str]:
    available = get_translation_providers(trans_cfg)
    preferred = _normalize_provider_name(preferred_provider)
    if preferred != "auto" and preferred in available:
        ordered = [preferred] + [p for p in available if p != preferred]
        return ordered
    return available


def translate_texts(
    texts: List[str],
    trans_cfg: Dict,
    preferred_provider: str = "auto",
) -> Tuple[List[str], str]:
    if not texts:
        return [], "none"

    # Track which indices have non-empty text to translate
    active_indices = [i for i, t in enumerate(texts) if t and str(t).strip()]
    source_texts = [texts[i] for i in active_indices]

    # If all texts are whitespace-only, return originals as fallback
    if not source_texts:
        return list(texts), "fallback"

    cfg = trans_cfg or {}
    deepseek_key = cfg.get("deepseek_key", "") or ""
    openai_key = cfg.get("openai_key", "") or ""
    groq_key = cfg.get("groq_key", "") or ""
    groq_model = cfg.get("groq_model", "llama-3.1-8b-instant") or "llama-3.1-8b-instant"
    hf_token = cfg.get("hf_token", "") or ""

    provider_order = build_provider_order(cfg, preferred_provider)

    def _rebuild(translated_active: List[str]) -> List[str]:
        """Map translated results back to original indices, preserving whitespace-only entries."""
        result = list(texts)
        for i, idx in enumerate(active_indices):
            if i < len(translated_active):
                result[idx] = translated_active[i]
        return result

    for provider in provider_order:
        try:
            if provider == "deepseek" and deepseek_key:
                result = _llm_translate(
                    source_texts,
                    "https://api.deepseek.com/v1/chat/completions",
                    deepseek_key,
                    "deepseek-chat",
                )
                if any(result):
                    return _rebuild(result), "deepseek"

            if provider == "openai" and openai_key:
                result = _llm_translate(
                    source_texts,
                    "https://api.openai.com/v1/chat/completions",
                    openai_key,
                    "gpt-4o-mini",
                )
                if any(result):
                    return _rebuild(result), "openai"

            if provider == "groq" and groq_key:
                result = _llm_translate(
                    source_texts,
                    "https://api.groq.com/openai/v1/chat/completions",
                    groq_key,
                    groq_model,
                )
                if any(result):
                    return _rebuild(result), "groq"

            if provider == "huggingface" and hf_token:
                hf_endpoints = [
                    (
                        "https://router.huggingface.co/novita/v3/openai/chat/completions",
                        "Qwen/Qwen2.5-72B-Instruct",
                    ),
                    (
                        "https://router.huggingface.co/featherless-ai/v1/chat/completions",
                        "Qwen/Qwen2.5-7B-Instruct",
                    ),
                    (
                        "https://router.huggingface.co/together/v1/chat/completions",
                        "Qwen/Qwen2.5-72B-Instruct",
                    ),
                    (
                        "https://router.huggingface.co/sambanova/v1/chat/completions",
                        "Qwen/Qwen2.5-72B-Instruct",
                    ),
                ]
                for hf_url, hf_model in hf_endpoints:
                    result = _llm_translate(source_texts, hf_url, hf_token, hf_model)
                    if any(result):
                        return _rebuild(result), "huggingface"

            if provider == "google":
                translated = []
                for text in source_texts:
                    query = urllib.parse.quote(text[:500])
                    url = (
                        "https://translate.googleapis.com/translate_a/single"
                        f"?client=gtx&sl=zh-CN&tl=vi&dt=t&dj=1&q={query}"
                    )
                    req = urllib.request.Request(
                        url,
                        headers={
                            "User-Agent": "Mozilla/5.0",
                            "Accept-Language": "vi",
                        },
                    )
                    with urllib.request.urlopen(req, timeout=6) as response:
                        data = json.loads(response.read())
                    if isinstance(data, dict):
                        sentences = data.get("sentences") or []
                        translated.append("".join(s.get("trans", "") for s in sentences))
                    else:
                        translated.append("".join(p[0] for p in data[0] if p[0]))
                if any(translated):
                    return _rebuild(translated), "google"
        except Exception:
            continue

    return list(texts), "fallback"


def _format_srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp format HH:MM:SS,mmm."""
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


class BatchTranslator:
    """Batch translation with multi-provider fallback.

    Fallback chain: DeepSeek → OpenAI → HuggingFace → Google
    """

    def __init__(self, trans_cfg: dict):
        self._cfg = trans_cfg or {}

    def translate(
        self,
        texts: List[str],
        preferred_provider: str = "auto",
    ) -> Tuple[List[str], str]:
        """Translate a list of texts in a single batch call.

        Returns (translated_texts, provider_used).
        If all providers fail, returns (original_texts, "fallback").
        """
        return translate_texts(texts, self._cfg, preferred_provider)

    def write_vi_srt(
        self,
        segments: List[dict],
        translations: List[str],
        out_path: Path,
    ) -> None:
        """Write a Vietnamese SRT file.

        Args:
            segments: List of dicts with 'start' and 'end' keys (seconds).
            translations: Translated text for each segment.
            out_path: Destination path for the .srt file.
        """
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        lines: List[str] = []
        for i, (seg, text) in enumerate(zip(segments, translations), start=1):
            start_ts = _format_srt_time(float(seg.get("start", 0)))
            end_ts = _format_srt_time(float(seg.get("end", 0)))
            lines.append(str(i))
            lines.append(f"{start_ts} --> {end_ts}")
            lines.append(text or "")
            lines.append("")
        out_path.write_text("\n".join(lines), encoding="utf-8")
