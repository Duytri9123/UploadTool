#!/usr/bin/env python3
"""TikTok OAuth helper for login and token storage."""

from __future__ import annotations

import json
import secrets
import time
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from urllib.parse import urlencode

import httpx


AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
DEFAULT_SCOPES = ["user.info.basic", "video.publish"]


class TikTokUploader:
    """Manage TikTok OAuth tokens for this app."""

    def __init__(self, tokens_dir: str = ".tiktok_tokens"):
        self.tokens_dir = Path(tokens_dir)
        self.tokens_dir.mkdir(exist_ok=True)
        self.token_file = self.tokens_dir / "tiktok_token.json"
        self.last_error = ""
        self._pending_state = ""

    def _load_token(self) -> Dict[str, Any]:
        if not self.token_file.exists():
            return {}
        try:
            return json.loads(self.token_file.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_token(self, payload: Dict[str, Any]):
        self.token_file.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _normalize_token_payload(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        data = raw.get("data") if isinstance(raw, dict) else None
        source = data if isinstance(data, dict) else raw

        access_token = str(source.get("access_token") or "").strip()
        refresh_token = str(source.get("refresh_token") or "").strip()
        token_type = str(source.get("token_type") or "Bearer").strip() or "Bearer"
        scope = str(source.get("scope") or "").strip()
        open_id = str(source.get("open_id") or "").strip()

        expires_in = int(source.get("expires_in") or 0)
        refresh_expires_in = int(source.get("refresh_expires_in") or 0)
        now = int(time.time())

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": token_type,
            "scope": scope,
            "open_id": open_id,
            "expires_in": expires_in,
            "refresh_expires_in": refresh_expires_in,
            "expires_at": now + max(expires_in - 60, 0) if expires_in else 0,
            "refresh_expires_at": (
                now + max(refresh_expires_in - 60, 0)
                if refresh_expires_in
                else 0
            ),
            "updated_at": now,
        }

    def _token_valid(self, token: Dict[str, Any]) -> bool:
        if not token:
            return False
        access_token = str(token.get("access_token") or "").strip()
        expires_at = int(token.get("expires_at") or 0)
        return bool(access_token) and (expires_at == 0 or expires_at > int(time.time()))

    def _refresh_token(
        self,
        client_key: str,
        client_secret: str,
        refresh_token: str,
    ) -> Dict[str, Any]:
        self.last_error = ""
        payload = {
            "client_key": client_key,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(TOKEN_URL, data=payload)
            body = response.json()
        except Exception as exc:
            self.last_error = f"Failed to refresh TikTok token: {exc}"
            return {}

        if response.status_code >= 400:
            err = body.get("error") if isinstance(body, dict) else body
            self.last_error = f"TikTok refresh token failed: {err}"
            return {}

        normalized = self._normalize_token_payload(body if isinstance(body, dict) else {})
        if not normalized.get("access_token"):
            self.last_error = "TikTok refresh token response missing access_token"
            return {}

        self._save_token(normalized)
        return normalized

    def get_auth_url(
        self,
        client_key: str,
        redirect_uri: str,
        scopes: Optional[Iterable[str]] = None,
    ) -> str:
        self.last_error = ""
        client_key = str(client_key or "").strip()
        redirect_uri = str(redirect_uri or "").strip()

        if not client_key:
            self.last_error = "Missing TikTok client_key"
            return ""
        if not redirect_uri:
            self.last_error = "Missing TikTok redirect_uri"
            return ""

        resolved_scopes = [s.strip() for s in (scopes or DEFAULT_SCOPES) if str(s).strip()]
        if not resolved_scopes:
            resolved_scopes = DEFAULT_SCOPES[:]

        self._pending_state = secrets.token_urlsafe(24)
        params = {
            "client_key": client_key,
            "scope": ",".join(resolved_scopes),
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "state": self._pending_state,
        }
        return f"{AUTH_URL}?{urlencode(params)}"

    def complete_auth_callback(
        self,
        code: str,
        state: str,
        client_key: str,
        client_secret: str,
        redirect_uri: str,
    ) -> bool:
        self.last_error = ""

        if self._pending_state and str(state or "") != self._pending_state:
            self.last_error = "TikTok OAuth state mismatch"
            return False

        payload = {
            "client_key": str(client_key or "").strip(),
            "client_secret": str(client_secret or "").strip(),
            "code": str(code or "").strip(),
            "grant_type": "authorization_code",
            "redirect_uri": str(redirect_uri or "").strip(),
        }

        if not payload["client_key"] or not payload["client_secret"]:
            self.last_error = "TikTok client_key/client_secret is missing"
            return False
        if not payload["code"]:
            self.last_error = "TikTok OAuth callback missing code"
            return False

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(TOKEN_URL, data=payload)
            body = response.json()
        except Exception as exc:
            self.last_error = f"Failed to exchange TikTok OAuth code: {exc}"
            return False

        if response.status_code >= 400:
            err = body.get("error") if isinstance(body, dict) else body
            self.last_error = f"TikTok OAuth token exchange failed: {err}"
            return False

        normalized = self._normalize_token_payload(body if isinstance(body, dict) else {})
        if not normalized.get("access_token"):
            self.last_error = "TikTok token response missing access_token"
            return False

        self._save_token(normalized)
        self._pending_state = ""
        return True

    def authenticate(self, client_key: str, client_secret: str) -> bool:
        token = self._load_token()
        if self._token_valid(token):
            return True

        refresh_token = str(token.get("refresh_token") or "").strip()
        if not refresh_token:
            return False

        refreshed = self._refresh_token(client_key, client_secret, refresh_token)
        return self._token_valid(refreshed)

    def get_auth_status(self) -> Dict[str, Any]:
        token = self._load_token()
        if not token:
            return {"authenticated": False}
        return {
            "authenticated": self._token_valid(token),
            "open_id": token.get("open_id", ""),
            "scope": token.get("scope", ""),
            "expires_at": token.get("expires_at", 0),
        }

    def revoke_auth(self) -> bool:
        self.last_error = ""
        self._pending_state = ""
        try:
            if self.token_file.exists():
                self.token_file.unlink()
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False
