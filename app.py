#!/usr/bin/env python3
"""Douyin Downloader — Flask Web UI"""
import asyncio, sys, time, threading, json, logging, io, os, re
from pathlib import Path
from datetime import datetime
import yaml
from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit

try:
    from pyngrok import ngrok
except Exception:
    ngrok = None

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
CONFIG_FILE = ROOT / "config.yml"
TIKTOK_VERIFY_DIR = ROOT / "tiktok_verification"
LOGGER = logging.getLogger("douyin-webui")

_NGROK_LOCK = threading.Lock()
_NGROK_PUBLIC_URL = ""
_NGROK_ERROR = ""

# ── default fallback cookies (not exposed to UI) ──────────────────────────────
_DEFAULT_COOKIES = {
    "ttwid": "1%7C0uxogqfezTrhN1YJ0i35KZv9fgo1yu6HYbmZuT-KVvw%7C1775052558%7C62485d542a14be7db9eb638974ae41e51276e62d045af80583fc7c123370707c",
    "odin_tt": "ded429e2000523eab758a3be8ab56d096d58a49e60bdbda955d2fe18d2cc4ba88289489964496c9f024646821417f688dcc9d23aa4ffb052321893beabe83d12b7af8feaf0409fb4786ae05783eea0ca",
    "passport_csrf_token": "60e588651b39d0a24d59e5981c4bf3ee",
    "s_v_web_id": "verify_mlml38zd_b7a50e45_9212_0298_a304_a911c914f42d",
    "__ac_nonce": "069cd375500a473596e",
    "__ac_signature": "_02B4Z6wo00f01dncC0AAAIDBu8IPB3sd.TnZ.A.AAB-87c",
    "UIFID": "164c22db5016193fd69c8bfb0b166ea3a563c2c88054b8eae8759946ea9753ce30fbd9414fde0e3bb8edf6ef3b15e498bb370dcbcae9f48ec0468161bb4bb9c7c36dd402b45c21a2c7c07bd0c8823022cb3eed3271b937879d8845056c80013921d8054aeb0756c78b55b25f5918e4171c63194f0ec22776be556fdf02d846f5b0688b4a38d7b0277ebc1c075101c71be9b1ec2c1d9249da5ff4be78f35b07ec79f57e0cafee3babb082d75b834e72a3",
    "bd_ticket_guard_client_web_domain": "2",
}

def _extract_cover(item: dict) -> str:
    """Try multiple fields to get the best cover URL."""
    video = item.get("video") or {}
    for field in ("dynamic_cover","origin_cover","cover"):
        ul = (video.get(field) or {}).get("url_list") or []
        if ul: return ul[0]
    # gallery / image post
    imgs = item.get("images") or []
    if imgs:
        ul = (imgs[0].get("url_list") or [])
        if ul: return ul[0]
    return ""

def get_cookies_with_fallback():
    """Load cookies from config, fallback to default if missing or incomplete."""
    try:
        cfg = load_cfg()
        if cfg.get("cookie_mode", "default") == "default":
            return _DEFAULT_COOKIES
        ck = cfg.get("cookies") or {}
        required = {"ttwid", "odin_tt", "passport_csrf_token"}
        if required.issubset({k for k,v in ck.items() if v}):
            return ck
    except Exception:
        pass
    return _DEFAULT_COOKIES

app = Flask(__name__)
app.config["SECRET_KEY"] = "douyin-dl-secret"
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=120,       # wait 2 min before declaring client dead
    ping_interval=30,       # ping every 30s to keep connection alive
)


@app.route("/<filename>.txt", methods=["GET"])
def serve_tiktok_verification_file(filename):
    verify_path = TIKTOK_VERIFY_DIR / f"{filename}.txt"
    if not verify_path.exists():
        return jsonify({"ok": False, "error": "verification file not found"}), 404
    return send_file(verify_path, mimetype="text/plain; charset=utf-8", as_attachment=False)

_dl_running = False
_tr_running = False

# ── Download Queue ────────────────────────────────────────────────────────────
import collections
_dl_queue   = collections.deque()   # list of {aweme_id, url, desc}
_queue_lock = threading.Lock()

@app.route("/api/queue", methods=["GET"])
def get_queue():
    with _queue_lock:
        return jsonify(list(_dl_queue))

@app.route("/api/queue/add", methods=["POST"])
def queue_add():
    items = request.json or []
    if isinstance(items, dict): items = [items]
    with _queue_lock:
        existing = {i["url"] for i in _dl_queue}
        added = 0
        for item in items:
            if item.get("url") and item["url"] not in existing:
                _dl_queue.append(item)
                existing.add(item["url"])
                added += 1
    socketio.emit("queue_update", list(_dl_queue))
    return jsonify({"ok": True, "added": added, "total": len(_dl_queue)})

@app.route("/api/queue/remove", methods=["POST"])
def queue_remove():
    url = (request.json or {}).get("url","")
    with _queue_lock:
        for i, item in enumerate(_dl_queue):
            if item.get("url") == url:
                del _dl_queue[i]; break
    socketio.emit("queue_update", list(_dl_queue))
    return jsonify({"ok": True})

@app.route("/api/queue/reorder", methods=["POST"])
def queue_reorder():
    urls = request.json or []
    with _queue_lock:
        by_url = {i["url"]: i for i in _dl_queue}
        _dl_queue.clear()
        for u in urls:
            if u in by_url: _dl_queue.append(by_url[u])
    socketio.emit("queue_update", list(_dl_queue))
    return jsonify({"ok": True})

@app.route("/api/queue/update", methods=["POST"])
def queue_update():
    data = request.json or {}
    url = (data.get("url") or "").strip()
    desc = (data.get("desc") or "").strip()
    if not url:
        return jsonify({"ok": False, "error": "missing url"}), 400
    with _queue_lock:
        updated = False
        for item in _dl_queue:
            if item.get("url") == url:
                item["desc"] = desc or url
                updated = True
                break
    if updated:
        socketio.emit("queue_update", list(_dl_queue))
    return jsonify({"ok": updated})

@app.route("/api/queue/clear", methods=["POST"])
def queue_clear():
    with _queue_lock: _dl_queue.clear()
    socketio.emit("queue_update", [])
    return jsonify({"ok": True})

# ── Cookie mode routes ────────────────────────────────────────────────────────
@app.route("/api/cookie_mode", methods=["GET"])
def get_cookie_mode():
    cfg = load_cfg()
    return jsonify({"mode": cfg.get("cookie_mode", "default")})

@app.route("/api/cookie_mode", methods=["POST"])
def set_cookie_mode():
    mode = (request.json or {}).get("mode", "default")
    cfg = load_cfg()
    cfg["cookie_mode"] = mode
    save_cfg(cfg)
    return jsonify({"ok": True})

# ── helpers ───────────────────────────────────────────────────────────────────
def load_cfg():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}

def save_cfg(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        yaml.dump(cfg, f, allow_unicode=True, default_flow_style=False)


def _as_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    text = str(value).strip().lower()
    if text in ("1", "true", "yes", "on"):
        return True
    if text in ("0", "false", "no", "off", ""):
        return False
    return default


def _get_ngrok_settings():
    cfg = load_cfg()
    ngrok_cfg = dict(cfg.get("ngrok") or {})
    enabled = _as_bool(
        os.getenv("NGROK_ENABLED"),
        _as_bool(ngrok_cfg.get("enabled"), False),
    )
    return {
        "enabled": enabled,
        "authtoken": str(os.getenv("NGROK_AUTHTOKEN") or ngrok_cfg.get("authtoken") or "").strip(),
        "domain": str(os.getenv("NGROK_DOMAIN") or ngrok_cfg.get("domain") or "").strip(),
        "bind_tls": _as_bool(os.getenv("NGROK_BIND_TLS"), _as_bool(ngrok_cfg.get("bind_tls"), True)),
    }


def _save_ngrok_public_url(public_url: str):
    cfg = load_cfg()
    ngrok_cfg = dict(cfg.get("ngrok") or {})
    ngrok_cfg["public_url"] = public_url
    cfg["ngrok"] = ngrok_cfg
    save_cfg(cfg)


def _start_ngrok_tunnel(port: int):
    global _NGROK_PUBLIC_URL, _NGROK_ERROR
    settings = _get_ngrok_settings()
    if not settings.get("enabled"):
        return

    with _NGROK_LOCK:
        if _NGROK_PUBLIC_URL:
            return

        if ngrok is None:
            _NGROK_ERROR = "pyngrok is not installed. Run: pip install pyngrok"
            LOGGER.warning(_NGROK_ERROR)
            return

        if not settings["authtoken"]:
            _NGROK_ERROR = (
                "Ngrok requires a verified account and authtoken. "
                "Set ngrok.authtoken in config.yml or NGROK_AUTHTOKEN env."
            )
            LOGGER.warning(_NGROK_ERROR)
            return

        try:
            if settings["authtoken"]:
                ngrok.set_auth_token(settings["authtoken"])

            options = {
                "addr": str(port),
                "bind_tls": settings["bind_tls"],
            }
            if settings["domain"]:
                options["domain"] = settings["domain"]

            tunnel = ngrok.connect(**options)
            _NGROK_PUBLIC_URL = str(getattr(tunnel, "public_url", "") or "").strip()
            if _NGROK_PUBLIC_URL:
                _NGROK_ERROR = ""
                _save_ngrok_public_url(_NGROK_PUBLIC_URL)
                LOGGER.info("Ngrok tunnel started: %s", _NGROK_PUBLIC_URL)
        except Exception as exc:
            raw_err = str(exc)
            token = settings.get("authtoken") or ""
            if token:
                raw_err = raw_err.replace(token, "***REDACTED***")
            raw_err = re.sub(r"(Your authtoken:\s*)(\S+)", r"\1***REDACTED***", raw_err)
            _NGROK_ERROR = raw_err
            LOGGER.error("Failed to start ngrok tunnel: %s", _NGROK_ERROR)


def _public_base_url(host: str, port: int) -> str:
    if _NGROK_PUBLIC_URL:
        return _NGROK_PUBLIC_URL
    cfg = load_cfg()
    fallback_url = str(((cfg.get("ngrok") or {}).get("public_url") or "")).strip()
    if fallback_url:
        return fallback_url
    return f"http://{host}:{port}"


def _get_tiktok_credentials(host: str = "127.0.0.1", port: int = 8080):
    cfg = load_cfg()
    upload_cfg = dict(cfg.get("upload") or {})
    tiktok_cfg = dict(upload_cfg.get("tiktok") or {})

    client_key_env = str(tiktok_cfg.get("client_key_env") or "TIKTOK_CLIENT_KEY").strip()
    client_secret_env = str(tiktok_cfg.get("client_secret_env") or "TIKTOK_CLIENT_SECRET").strip()

    client_key = str(os.getenv(client_key_env) or tiktok_cfg.get("client_key") or "").strip()
    client_secret = str(os.getenv(client_secret_env) or tiktok_cfg.get("client_secret") or "").strip()
    redirect_uri = str(tiktok_cfg.get("redirect_uri") or "").strip()
    if not redirect_uri:
        redirect_uri = f"{_public_base_url(host, port)}/api/tiktok/callback"

    return {
        "client_key": client_key,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "client_key_env": client_key_env,
        "client_secret_env": client_secret_env,
    }


def _get_tiktok_scopes():
    cfg = load_cfg()
    tiktok_cfg = dict(((cfg.get("upload") or {}).get("tiktok") or {}))
    scopes = tiktok_cfg.get("scopes")
    if isinstance(scopes, str):
        scopes = [s.strip() for s in scopes.split(",") if s.strip()]
    if isinstance(scopes, list):
        cleaned = [str(s).strip() for s in scopes if str(s).strip()]
        if cleaned:
            return cleaned
    return ["user.info.basic", "video.publish"]


_tiktok_uploader = None


def _get_tiktok_uploader():
    global _tiktok_uploader
    if _tiktok_uploader is None:
        from tools.tiktok_uploader import TikTokUploader

        _tiktok_uploader = TikTokUploader()
    return _tiktok_uploader


def _deep_merge_dict(base, updates):
    merged = dict(base or {})
    for key, value in (updates or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge_dict(merged.get(key), value)
        else:
            merged[key] = value
    return merged


_naming_title_cache = {}


def _resolve_naming_title(raw_title: str) -> str:
    raw_title = str(raw_title or "").strip()
    if not raw_title:
        return "video"

    cfg = load_cfg()
    tr_cfg = dict(cfg.get("translation") or {})
    if not tr_cfg.get("naming_enabled", False):
        return raw_title

    cache_key = (raw_title, tr_cfg.get("preferred_provider", "auto"))
    if cache_key in _naming_title_cache:
        return _naming_title_cache[cache_key]

    try:
        from utils.translation import translate_texts

        translated, _provider = translate_texts([raw_title], tr_cfg, tr_cfg.get("preferred_provider", "auto"))
        resolved = (translated[0] if translated else "").strip() or raw_title
    except Exception:
        resolved = raw_title

    _naming_title_cache[cache_key] = resolved
    return resolved

# ── SocketIO progress shim ────────────────────────────────────────────────────
class SocketProgress:
    _STEPS = 6
    def __init__(self, sid):
        self._sid = sid
        self._step = 0; self._item_done = 0; self._item_total = 1
        self._url_i = 0; self._url_n = 0
        self._url = ""
        self._stats = {"success":0,"failed":0,"skipped":0}

    def _emit(self, event, data):
        socketio.emit(event, data, to=self._sid)

    def _log(self, msg, level="info"):
        self._emit("log", {"msg": msg, "level": level})

    def show_banner(self):         self._log("══ Douyin Downloader v2.0.0 ══", "banner")
    def print_info(self,m):        self._log(f"ℹ  {m}", "info")
    def print_success(self,m):     self._log(f"✓  {m}", "success")
    def print_warning(self,m):     self._log(f"⚠  {m}", "warning")
    def print_error(self,m):       self._log(f"✗  {m}", "error")

    def start_download_session(self,n):
        self._url_n=n
        self._emit("progress", {"type":"overall","pct":0,"label":f"0/{n} URL"})

    def stop_download_session(self):
        self._emit("progress", {"type":"overall","pct":100,"label":"完成"})

    def start_url(self,i,n,url):
        self._url_i=i; self._url_n=n; self._step=0
        self._url = url
        self._item_done=0; self._item_total=1
        self._stats={"success":0,"failed":0,"skipped":0}
        self._emit("progress", {"type":"step","pct":0,"label":f"[{i}/{n}] 待开始"})
        self._log(f"▶ [{i}/{n}] {url}", "url")

    def complete_url(self,result=None):
        self._emit("progress", {"type":"step","pct":100,"label":f"[{self._url_i}/{self._url_n}] 完成"})
        pct=int(self._url_i/max(self._url_n,1)*100)
        self._emit("progress", {"type":"overall","pct":pct,"label":f"{self._url_i}/{self._url_n} URL"})
        if result:
            self._log(f"✓ 成功:{result.success} 失败:{result.failed} 跳过:{result.skipped}", "success")

    def fail_url(self,reason):
        self._emit("progress", {"type":"step","pct":100,"label":f"[{self._url_i}/{self._url_n}] 失败"})
        self._log(f"✗ {reason}", "error")

    def advance_step(self,step,detail=""):
        self._step=min(self._step+1,self._STEPS)
        pct=int(self._step/self._STEPS*100)
        self._emit("progress", {"type":"step","pct":pct,"label":f"[{self._url_i}/{self._url_n}] {step}"})
        if detail: self._log(f"   → {step}: {detail}", "detail")

    def update_step(self,step,detail=""):
        pct=int(self._step/self._STEPS*100)
        self._emit("progress", {"type":"step","pct":pct,"label":f"[{self._url_i}/{self._url_n}] {step}"})
        if detail: self._log(f"   → {step}: {detail}", "detail")

    def set_item_total(self,total,detail=""):
        self._item_total=max(total,1); self._item_done=0
        self._stats={"success":0,"failed":0,"skipped":0}
        self._emit("progress", {"type":"item","pct":0,"label":f"作品 0/{total}","url":self._url})
        if detail: self._log(f"   {detail}", "detail")

    def update_post_progress(self,pct,label=""):
        try:
            p = max(0, min(100, int(pct)))
        except Exception:
            p = 0
        self._emit("progress", {"type":"post","pct":p,"label":label or "","url":self._url})

    def advance_item(self,status,detail=""):
        if status in self._stats: self._stats[status]+=1
        self._item_done=min(self._item_done+1,self._item_total)
        pct=int(self._item_done/self._item_total*100)
        s=self._stats
        self._emit("progress", {"type":"item","pct":pct,
            "label":f"作品 {self._item_done}/{self._item_total}  ✓{s['success']} ✗{s['failed']} -{s['skipped']}","url":self._url})

    def show_result(self,result):
        self._log(f"{'─'*44}", "result")
        self._log(f"总计:{result.total}  成功:{result.success}  失败:{result.failed}  跳过:{result.skipped}", "result")
        self._log(f"{'─'*44}", "result")

# ── Routes ────────────────────────────────────────────────────────────────────
def _render_spa(active_tab="user"):
    return render_template("spa.html", active=active_tab, jsv=int(time.time()))

@app.route("/")
def index():
    return _render_spa("user")

@app.route("/config")
def page_config():
    return _render_spa("config")

@app.route("/cookies")
def page_cookies():
    return _render_spa("cookies")

@app.route("/download")
def page_download():
    return _render_spa("download")

@app.route("/user")
def page_user():
    return _render_spa("user")

@app.route("/transcribe")
def page_transcribe():
    return _render_spa("transcribe")

@app.route("/history")
def page_history():
    return _render_spa("history")

@app.route("/process")
def page_process():
    return _render_spa("process")

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(load_cfg())

@app.route("/api/config", methods=["POST"])
def post_config():
    data = request.json or {}
    cfg = load_cfg()
    cfg = _deep_merge_dict(cfg, data)
    save_cfg(cfg)
    return jsonify({"ok": True})


@app.route("/api/ngrok/status", methods=["GET"])
def ngrok_status():
    host = "127.0.0.1"
    port = 8080
    settings = _get_ngrok_settings()
    if settings.get("enabled") and not _NGROK_PUBLIC_URL:
        _start_ngrok_tunnel(port)
    public_url = _public_base_url(host, port)
    return jsonify(
        {
            "ok": True,
            "enabled": bool(settings.get("enabled")),
            "public_url": public_url,
            "tunnel_active": bool(_NGROK_PUBLIC_URL),
            "local_url": f"http://{host}:{port}",
            "tiktok_callback_url": f"{public_url}/api/tiktok/callback",
            "error": _NGROK_ERROR,
        }
    )


@app.route("/api/tiktok/callback", methods=["GET", "POST"])
def tiktok_callback():
    query = request.args.to_dict(flat=True)
    payload = request.get_json(silent=True) or {}
    LOGGER.info("TikTok callback query=%s payload=%s", query, payload)

    # OAuth callback path (TikTok Login Kit / Content Posting API)
    code = str(query.get("code") or payload.get("code") or "").strip()
    state = str(query.get("state") or payload.get("state") or "").strip()
    if code:
        creds = _get_tiktok_credentials("127.0.0.1", 8080)
        uploader = _get_tiktok_uploader()
        ok = uploader.complete_auth_callback(
            code=code,
            state=state,
            client_key=creds.get("client_key", ""),
            client_secret=creds.get("client_secret", ""),
            redirect_uri=creds.get("redirect_uri", ""),
        )
        if ok:
            return """
<!doctype html>
<html><head><meta charset="utf-8"><title>TikTok Connected</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;line-height:1.5;">
    <h3>TikTok connected successfully.</h3>
    <p>You can close this window and return to the app.</p>
    <script>
        try { window.close(); } catch (e) {}
    </script>
</body></html>
"""

        err = str(getattr(uploader, "last_error", "") or "OAuth callback failed")
        return f"""
<!doctype html>
<html><head><meta charset=\"utf-8\"><title>TikTok OAuth Error</title></head>
<body style=\"font-family:Arial,sans-serif;padding:24px;line-height:1.5;\">
    <h3>Failed to connect TikTok.</h3>
    <p>{err}</p>
    <p>Please close this window and click \"Đăng nhập TikTok\" again.</p>
</body></html>
""", 400

    # Webhook/domain verification challenge path.
    challenge = query.get("challenge") or query.get("hub.challenge")
    if challenge:
        return jsonify({"ok": True, "challenge": challenge})
    return jsonify({"ok": True, "received": True})


@app.route("/api/tiktok/credentials_status", methods=["GET"])
def tiktok_credentials_status():
    host = "127.0.0.1"
    port = 8080
    creds = _get_tiktok_credentials(host, port)
    return jsonify(
        {
            "ok": True,
            "has_client_key": bool(creds.get("client_key")),
            "has_client_secret": bool(creds.get("client_secret")),
            "client_key_env": creds.get("client_key_env"),
            "client_secret_env": creds.get("client_secret_env"),
            "redirect_uri": creds.get("redirect_uri"),
            "callback_url": f"{_public_base_url(host, port)}/api/tiktok/callback",
        }
    )


@app.route("/api/tiktok_auth", methods=["GET", "POST"])
def tiktok_auth():
    creds = _get_tiktok_credentials("127.0.0.1", 8080)
    uploader = _get_tiktok_uploader()
    client_key = str(creds.get("client_key") or "").strip()
    client_secret = str(creds.get("client_secret") or "").strip()

    if not client_key or not client_secret:
        return jsonify(
            {
                "ok": False,
                "authenticated": False,
                "error_code": "missing_tiktok_credentials",
                "error": "Missing TikTok client_key/client_secret",
            }
        ), 400

    if request.method == "POST":
        uploader.revoke_auth()
        auth_url = uploader.get_auth_url(
            client_key=client_key,
            redirect_uri=creds.get("redirect_uri", ""),
            scopes=_get_tiktok_scopes(),
        )
        if not auth_url:
            return jsonify(
                {
                    "ok": False,
                    "authenticated": False,
                    "error_code": "auth_url_unavailable",
                    "error": str(getattr(uploader, "last_error", "") or "Unable to start TikTok OAuth"),
                }
            ), 400
        return jsonify({"ok": True, "authenticated": False, "auth_url": auth_url})

    if uploader.authenticate(client_key, client_secret):
        status = uploader.get_auth_status()
        return jsonify(
            {
                "ok": True,
                "authenticated": True,
                "account": {
                    "open_id": status.get("open_id", ""),
                    "scope": status.get("scope", ""),
                    "expires_at": status.get("expires_at", 0),
                },
            }
        )

    auth_url = uploader.get_auth_url(
        client_key=client_key,
        redirect_uri=creds.get("redirect_uri", ""),
        scopes=_get_tiktok_scopes(),
    )
    if not auth_url:
        return jsonify(
            {
                "ok": False,
                "authenticated": False,
                "error_code": "auth_url_unavailable",
                "error": str(getattr(uploader, "last_error", "") or "Unable to prepare TikTok OAuth"),
            }
        ), 400
    return jsonify({"ok": True, "authenticated": False, "auth_url": auth_url})


@app.route("/api/tiktok_logout", methods=["POST"])
def tiktok_logout():
    uploader = _get_tiktok_uploader()
    if uploader.revoke_auth():
        return jsonify({"ok": True, "message": "Logged out from TikTok"})
    return jsonify({"ok": False, "error": str(getattr(uploader, "last_error", "") or "Failed to logout")}), 500

@app.route("/api/cookies", methods=["POST"])
def post_cookies():
    data = request.json or {}
    cfg = load_cfg()
    cfg["cookies"] = data
    save_cfg(cfg)
    return jsonify({"ok": True})

@app.route("/api/parse_cookie", methods=["POST"])
def parse_cookie():
    raw = (request.json or {}).get("raw", "")
    from utils.cookie_utils import parse_cookie_header
    parsed = parse_cookie_header(raw)
    return jsonify(parsed)

@app.route("/api/validate_cookie", methods=["POST"])
def validate_cookie():
    data = request.json or {}
    from auth import CookieManager
    cm = CookieManager()
    cm.set_cookies(data)
    ok = cm.validate_cookies()
    return jsonify({"ok": ok})

@app.route("/api/user_videos_page", methods=["POST"])
def user_videos_page():
    data = request.json or {}
    url    = data.get("url","").strip()
    cursor = int(data.get("cursor", 0))
    count  = int(data.get("count", 20))
    offset = int(data.get("offset", 0))  # số video đã có ở client, dùng khi cursor=0
    if not url:
        return jsonify({"error":"No URL"}), 400

    def parse_items(items):
        videos = []
        for item in items:
            cover = _extract_cover(item)
            ts = item.get("create_time", 0)
            dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""
            videos.append({
                "aweme_id": item.get("aweme_id",""),
                "desc":     (item.get("desc","") or "")[:80],
                "cover":    cover,
                "date":     dt,
                "ts":       ts,
                "play":     (item.get("statistics") or {}).get("play_count",0),
                "like":     (item.get("statistics") or {}).get("digg_count",0),
                "comment":  (item.get("statistics") or {}).get("comment_count",0),
                "type":     "gallery" if item.get("images") else "video",
                "duration": (item.get("video") or {}).get("duration", 0) or
                            (item.get("video") or {}).get("video_duration", 0) or
                            item.get("duration", 0) or 0,
            })
        return videos

    async def fetch():
        from config import ConfigLoader
        from auth import CookieManager
        from core import DouyinAPIClient, URLParser
        config = ConfigLoader(str(CONFIG_FILE))
        cm = CookieManager(); cm.set_cookies(get_cookies_with_fallback())
        parsed = URLParser.parse(url)
        if not parsed or parsed.get("type") != "user":
            return {"error": "Invalid user URL"}
        sec_uid = parsed.get("sec_uid","")
        async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
            # Nếu cursor=0 nhưng offset>0, cần loop qua các trang để bỏ qua offset video đầu
            if cursor == 0 and offset > 0:
                all_items = []
                cur = 0
                seen_ids = set()
                # Loop tối đa 20 trang, dừng khi không còn item mới hoặc cursor không tiến
                for _ in range(20):
                    result = await api.get_user_post(sec_uid, max_cursor=cur, count=20)
                    page_items = result.get("items") or result.get("aweme_list") or []
                    added = 0
                    for item in page_items:
                        aid = item.get("aweme_id")
                        if aid and aid not in seen_ids:
                            seen_ids.add(aid)
                            all_items.append(item)
                            added += 1
                    new_cursor = int(result.get("max_cursor", 0) or 0)
                    # Dừng nếu: không có item mới, cursor không tiến, hoặc đã đủ
                    if added == 0 or new_cursor == cur or len(all_items) >= offset + count:
                        break
                    cur = new_cursor
                has_more_final = len(all_items) > offset + count
                slice_items = all_items[offset:offset + count]
                return {
                    "videos":      parse_items(slice_items),
                    "has_more":    has_more_final,
                    "next_cursor": cur,
                    "offset":      offset + len(slice_items),
                }
            else:
                result = await api.get_user_post(sec_uid, max_cursor=cursor, count=count)
                items  = result.get("items") or result.get("aweme_list") or []
                return {
                    "videos":      parse_items(items),
                    "has_more":    result.get("has_more", False),
                    "next_cursor": result.get("max_cursor", 0),
                    "offset":      offset + len(items),
                }
    try:
        return jsonify(asyncio.run(fetch()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
def user_videos():
    data = request.json or {}
    url = data.get("url","").strip()
    max_count = int(data.get("max_count", 0))  # 0 = all
    if not url:
        return jsonify({"error":"No URL"}), 400

    from flask import Response, stream_with_context
    import json as _j

    def generate():
        async def fetch_all():
            from config import ConfigLoader
            from auth import CookieManager
            from core import DouyinAPIClient, URLParser
            config = ConfigLoader(str(CONFIG_FILE))
            cm = CookieManager(); cm.set_cookies(get_cookies_with_fallback())
            parsed = URLParser.parse(url)
            if not parsed or parsed.get("type") != "user":
                yield {"error": "Invalid user URL"}; return
            sec_uid = parsed.get("sec_uid","")
            cursor = 0; page = 0; total = 0

            async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
                while True:
                    page += 1
                    result = await api.get_user_post(sec_uid, max_cursor=cursor, count=20)
                    items = result.get("items") or result.get("aweme_list") or []
                    if not items:
                        break
                    videos = []
                    for item in items:
                        cover = ""
                        vc = (item.get("video") or {}).get("cover") or \
                             (item.get("video") or {}).get("origin_cover") or {}
                        ul = vc.get("url_list") or []
                        if ul: cover = ul[0]
                        if not cover:
                            imgs = item.get("images") or []
                            if imgs:
                                ul2 = (imgs[0].get("url_list") or [])
                                if ul2: cover = ul2[0]
                        ts = item.get("create_time",0)
                        dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""
                        videos.append({
                            "aweme_id": item.get("aweme_id",""),
                            "desc":     (item.get("desc","") or "")[:80],
                            "cover":    cover,
                            "date":     dt,
                            "ts":       ts,
                            "play":     (item.get("statistics") or {}).get("play_count",0),
                            "like":     (item.get("statistics") or {}).get("digg_count",0),
                            "comment":  (item.get("statistics") or {}).get("comment_count",0),
                            "type":     "gallery" if item.get("images") else "video",
                            "duration": (item.get("video") or {}).get("duration", 0) or
                                        (item.get("video") or {}).get("video_duration", 0) or
                                        item.get("duration", 0) or 0,
                        })
                    total += len(videos)
                    yield {"page": page, "videos": videos, "total_so_far": total,
                           "has_more": result.get("has_more", False)}
                    if not result.get("has_more"):
                        break
                    if max_count > 0 and total >= max_count:
                        break
                    cursor = result.get("max_cursor", 0)
                    if not cursor:
                        break

        import asyncio as _asyncio

        async def run():
            async for chunk in fetch_all():
                yield _j.dumps(chunk) + "\n"

        # run async generator synchronously
        loop = _asyncio.new_event_loop()
        agen = run()
        try:
            while True:
                try:
                    chunk = loop.run_until_complete(agen.__anext__())
                    yield chunk
                except StopAsyncIteration:
                    break
        finally:
            loop.close()

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

@app.route("/api/proxy_image")
def proxy_image():
    from flask import Response
    import urllib.request
    from urllib.parse import urlparse as _up
    url = request.args.get("url","")
    if not url: return "", 400
    allowed = ("douyinpic.com","byteimg.com","tiktokcdn.com",
               "douyin.com","pstatp.com","bytedance.com","ixigua.com")
    host = _up(url).hostname or ""
    if not any(host.endswith(d) for d in allowed): return "", 403
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer":    "https://www.douyin.com/",
            "Accept":     "image/webp,image/apng,image/*,*/*;q=0.8",
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            ct   = resp.headers.get("Content-Type","image/jpeg")
        r = Response(data, content_type=ct)
        r.headers["Cache-Control"] = "public, max-age=86400"
        return r
    except Exception:
        return "", 404
@app.route("/api/history", methods=["GET"])
def get_history():
    cfg = load_cfg()
    db_path = cfg.get("database_path", "dy_downloader.db") or "dy_downloader.db"
    async def fetch():
        from storage import Database
        db = Database(db_path=db_path)
        await db.initialize()
        conn = await db._get_conn()
        cur = await conn.execute(
            "SELECT download_time,url,url_type,total_count,success_count "
            "FROM download_history ORDER BY id DESC LIMIT 200")
        rows = await cur.fetchall()
        await db.close()
        return rows
    try:
        rows = asyncio.run(fetch())
        data = []
        for r in rows:
            ts = datetime.fromtimestamp(r[0]).strftime("%Y-%m-%d %H:%M") if r[0] else "—"
            data.append({"time":ts,"url":r[1],"type":r[2],"total":r[3],"success":r[4]})
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/history/clear", methods=["POST"])
def clear_history():
    cfg = load_cfg()
    db_path = cfg.get("database_path","dy_downloader.db") or "dy_downloader.db"
    async def do():
        from storage import Database
        db = Database(db_path=db_path)
        await db.initialize()
        conn = await db._get_conn()
        await conn.execute("DELETE FROM download_history")
        await conn.commit()
        await db.close()
    asyncio.run(do())
    return jsonify({"ok": True})

@app.route("/api/user_info", methods=["POST"])
def user_info():
    data = request.json or {}
    url = data.get("url","").strip()
    if not url:
        return jsonify({"error":"No URL"}), 400

    async def fetch():
        import asyncio as _asyncio
        from config import ConfigLoader
        from auth import CookieManager
        from core import DouyinAPIClient, URLParser
        config = ConfigLoader(str(CONFIG_FILE))
        cm = CookieManager(); cm.set_cookies(get_cookies_with_fallback())
        parsed = URLParser.parse(url)
        if not parsed or parsed.get("type") != "user":
            return None, []
        sec_uid = parsed.get("sec_uid","")
        async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
            info = await api.get_user_info(sec_uid)
            if not info:
                return None, []

            # Lấy hết tất cả video: loop nhiều trang cho đến khi hết
            all_items = []
            seen_ids = set()
            cursor = 0
            pagination_blocked = False
            for _ in range(200):  # tối đa 200 trang = 4000 video
                result = await api.get_user_post(sec_uid, max_cursor=cursor, count=20)
                page_items = result.get("items") or result.get("aweme_list") or []
                added = 0
                for item in page_items:
                    aid = item.get("aweme_id")
                    if aid and aid not in seen_ids:
                        seen_ids.add(aid)
                        all_items.append(item)
                        added += 1
                new_cursor = int(result.get("max_cursor", 0) or 0)
                # Dừng khi không có item mới hoặc cursor không tiến
                if added == 0 or new_cursor == cursor:
                    if cursor > 0 and added == 0:
                        pagination_blocked = True
                    break
                cursor = new_cursor
                await _asyncio.sleep(0.3)  # delay nhỏ tránh rate limit

            return info, all_items, pagination_blocked

    def parse_item(item):
        cover = _extract_cover(item)
        ts = item.get("create_time", 0)
        dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""
        return {
            "aweme_id": item.get("aweme_id", ""),
            "desc":     (item.get("desc", "") or "")[:80],
            "cover":    cover,
            "date":     dt,
            "ts":       ts,
            "play":     (item.get("statistics") or {}).get("play_count", 0),
            "like":     (item.get("statistics") or {}).get("digg_count", 0),
            "type":     "gallery" if item.get("images") else "video",
            "duration": (item.get("video") or {}).get("duration", 0) or
                        (item.get("video") or {}).get("video_duration", 0) or
                        item.get("duration", 0) or 0,
        }

    try:
        info, all_items, pagination_blocked = asyncio.run(fetch())
        if not info:
            return jsonify({"error": "User not found or invalid URL"}), 404

        videos = [parse_item(i) for i in all_items]
        aweme_count = info.get("aweme_count", 0)
        return jsonify({
            "nickname":    info.get("nickname", ""),
            "uid":         info.get("uid", ""),
            "sec_uid":     info.get("sec_uid", ""),
            "signature":   info.get("signature", ""),
            "avatar":      ((info.get("avatar_thumb") or {}).get("url_list") or [""])[0],
            "follower":    info.get("follower_count", 0),
            "following":   info.get("following_count", 0),
            "aweme_count": aweme_count,
            "videos":      videos,
            "has_more":    False,
            "next_cursor": 0,
            "pagination_blocked": pagination_blocked,
            "fetched_count": len(videos),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── SocketIO download ─────────────────────────────────────────────────────────
@socketio.on("start_download")
def handle_download(data):
    global _dl_running
    if _dl_running:
        emit("log", {"msg":"Already running","level":"warning"}); return
    _dl_running = True
    sid = request.sid
    # queue mode: download items from queue one by one
    use_queue = (data or {}).get("use_queue", False)
    extra_url = (data or {}).get("extra_url","").strip()
    post_process = (data or {}).get("post_process") or {}

    def run():
        global _dl_running
        try:
            from config import ConfigLoader
            from auth import CookieManager
            from storage import Database, FileManager
            from control import QueueManager, RateLimiter, RetryHandler
            from core import DouyinAPIClient, URLParser, DownloaderFactory
            from core.downloader_base import DownloadResult
            from utils.logger import set_console_log_level
            import json as _j
            set_console_log_level(logging.CRITICAL)

            prog = SocketProgress(sid)
            config = ConfigLoader(str(CONFIG_FILE))

            # build URL list
            queue_snapshot = []
            if use_queue:
                with _queue_lock:
                    queue_snapshot = list(_dl_queue)
                    urls = [i["url"] for i in queue_snapshot]
            elif extra_url:
                urls = [extra_url]
            else:
                urls = config.get_links()

            if not urls:
                prog.print_error("No URLs to download"); return

            # override config links
            config.update(link=urls)

            # Optional title overrides from queue (used for filename naming).
            if queue_snapshot:
                custom_titles = {}
                for item in queue_snapshot:
                    item_url = str(item.get("url") or "").strip()
                    item_desc = str(item.get("desc") or "").strip()
                    if not item_url or not item_desc:
                        continue
                    parsed_item = URLParser.parse(item_url) or {}
                    aweme_id = str(parsed_item.get("aweme_id") or "").strip()
                    if aweme_id:
                        custom_titles[aweme_id] = item_desc
                if custom_titles:
                    config.update(custom_titles=custom_titles)

            # Optional one-time post-process overrides from Download page.
            vp_cfg = dict(config.get("video_process") or {})
            tr_cfg = dict(config.get("translation") or {})
            transcript_cfg = dict(config.get("transcript") or {})
            pp_enabled = bool(post_process.get("enabled", True))
            if pp_enabled:
                vp_cfg.update({
                    "enabled": True,
                    "burn_subs": bool(post_process.get("burn_subs", True)),
                    "translate_subs": bool(post_process.get("translate_subs", True)),
                    "burn_vi_subs": bool(post_process.get("burn_vi_subs", True)),
                    "voice_convert": bool(post_process.get("voice_convert", True)),
                    "keep_bg_music": bool(post_process.get("keep_bg_music", True)),
                })
                translate_provider = str(post_process.get("translate_provider") or "").strip()
                if translate_provider:
                    if translate_provider == "auto":
                        translate_provider = "deepseek"
                    tr_cfg["preferred_provider"] = translate_provider
                groq_api_key = str(post_process.get("groq_api_key") or "").strip()
                groq_model = str(post_process.get("groq_model") or "").strip()
                if groq_api_key:
                    transcript_cfg["groq_api_key"] = groq_api_key
                if groq_model:
                    transcript_cfg["groq_model"] = groq_model
            elif post_process:
                vp_cfg.update({"enabled": False})

            if vp_cfg:
                config.update(video_process=vp_cfg)
            if tr_cfg:
                config.update(translation=tr_cfg)
            if transcript_cfg:
                config.update(transcript=transcript_cfg)

            if not config.validate():
                prog.print_error("Invalid config"); return

            cm = CookieManager(); cm.set_cookies(get_cookies_with_fallback())
            if not cm.validate_cookies():
                prog.print_warning("Cookies may be invalid")

            db = None
            if config.get("database"):
                db = Database(db_path=str(config.get("database_path","dy_downloader.db")))

            async def _run():
                if db: await db.initialize(); prog.print_success("Database initialized")
                prog.print_info(f"Found {len(urls)} URL(s)")
                prog.start_download_session(len(urls))
                results = []
                try:
                    for i, url in enumerate(urls, 1):
                        prog.start_url(i, len(urls), url); orig = url
                        # Notify frontend which URL is currently downloading
                        socketio.emit("downloading_url", {"url": orig, "index": i, "total": len(urls)}, to=sid)
                        socketio.emit("queue_item_state", {"url": orig, "state": "running"}, to=sid)
                        try:
                            fm = FileManager(config.get("path"))
                            rl = RateLimiter(max_per_second=float(config.get("rate_limit",5) or 5))
                            rh = RetryHandler(max_retries=config.get("retry_times",3))
                            qm = QueueManager(max_workers=int(config.get("thread",5) or 5))
                            async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
                                prog.advance_step("解析链接","")
                                if url.startswith("https://v.douyin.com"):
                                    r = await api.resolve_short_url(url)
                                    if r: url = r
                                parsed = URLParser.parse(url)
                                if not parsed: prog.fail_url("URL parse failed"); continue
                                prog.advance_step("创建下载器", parsed["type"])
                                dl = DownloaderFactory.create(parsed["type"],config,api,fm,cm,db,rl,rh,qm,progress_reporter=prog)
                                if not dl: prog.fail_url("No downloader"); continue
                                prog.advance_step("执行下载","")
                                result = await dl.download(parsed)
                                prog.advance_step("记录历史","")
                                if result and db:
                                    safe = {k:v for k,v in config.config.items() if k not in ("cookies","cookie","transcript")}
                                    await db.add_history({"url":orig,"url_type":parsed["type"],"total_count":result.total,"success_count":result.success,"config":_j.dumps(safe,ensure_ascii=False)})
                                prog.advance_step("收尾","")
                                if result:
                                    results.append(result); prog.complete_url(result)
                                    socketio.emit("queue_item_state", {"url": orig, "state": "success"}, to=sid)
                                    # remove from queue after success
                                    if use_queue:
                                        with _queue_lock:
                                            for idx2, qi in enumerate(_dl_queue):
                                                if qi["url"] == orig:
                                                    del _dl_queue[idx2]; break
                                        socketio.emit("queue_update", list(_dl_queue), to=sid)
                                else:
                                    socketio.emit("queue_item_state", {"url": orig, "state": "failed"}, to=sid)
                                    prog.fail_url("No result")
                        except Exception as e:
                            socketio.emit("queue_item_state", {"url": orig, "state": "failed"}, to=sid)
                            prog.fail_url(str(e)); prog.print_error(str(e))
                finally:
                    prog.stop_download_session()
                    if db: await db.close()
                if results:
                    tot = DownloadResult()
                    for r in results: tot.total+=r.total;tot.success+=r.success;tot.failed+=r.failed;tot.skipped+=r.skipped
                    prog.show_result(tot)
                socketio.emit("done", {"ok":True}, to=sid)

            asyncio.run(_run())
        except Exception as e:
            socketio.emit("log", {"msg":f"Fatal: {e}","level":"error"}, to=sid)
            socketio.emit("done", {"ok":False}, to=sid)
        finally:
            _dl_running = False

    threading.Thread(target=run, daemon=True).start()



@app.route("/api/translate_batch", methods=["POST"])
def api_translate_batch():
    """Translate multiple texts in one request to save tokens."""
    data = request.json or {}
    texts = data.get("texts") or []
    provider = data.get("provider", "auto")
    if not texts:
        return jsonify({"results": [], "provider": "none"})
    cfg = load_cfg()
    trans_cfg = cfg.get("translation") or {}
    try:
        from utils.translation import translate_texts
        results, used = translate_texts(texts, trans_cfg, provider)
        return jsonify({"results": results, "provider": used})
    except Exception as e:
        return jsonify({"results": texts, "provider": "error", "error": str(e)})

@app.route("/api/translate", methods=["POST"])
def api_translate():
    data = request.json or {}
    text = (data.get("text") or "").strip()
    provider = data.get("provider", "auto")
    if not text:
        return jsonify({"result": "", "provider": "none"})
    cfg = load_cfg()
    trans_cfg = cfg.get("translation") or {}
    try:
        from utils.translation import translate_texts
        results, used = translate_texts([text], trans_cfg, provider)
        return jsonify({"result": results[0] if results else text, "provider": used})
    except Exception as e:
        return jsonify({"result": text, "provider": "error", "error": str(e)})

@app.route("/api/translation_status", methods=["GET"])
def translation_status():
    cfg = load_cfg()
    trans_cfg = cfg.get("translation") or {}
    from utils.translation import get_translation_providers
    providers = get_translation_providers(trans_cfg)
    preferred = trans_cfg.get("preferred_provider", "auto")
    return jsonify({
        "providers": providers,
        "preferred": preferred,
        "has_deepseek": bool(trans_cfg.get("deepseek_key")),
        "has_openai": bool(trans_cfg.get("openai_key")),
        "has_hf": bool(trans_cfg.get("hf_token")),
    })

@app.route("/api/tts_preview", methods=["POST"])
def tts_preview():
    data = request.json or {}
    text = str(data.get("text") or "").strip()
    tts_engine = str(data.get("tts_engine") or "edge-tts").strip().lower()
    tts_voice = str(data.get("tts_voice") or "banmai").strip()
    tts_pitch = str(data.get("tts_pitch") or "+0Hz").strip()
    tts_rate  = str(data.get("tts_rate") or "+0%").strip()
    tts_emotion = str(data.get("tts_emotion") or "default").strip()

    if not text:
        return jsonify({"ok": False, "error": "Text preview is empty"}), 400

    try:
        import tempfile
        from pathlib import Path as _Path
        from core.video_processor import _tts_edge, _tts_gtts, _tts_fpt_ai, FPT_TTS_DEFAULT_KEY
        cfg = load_cfg()
        vp_cfg = cfg.get("video_process") or {}
        fpt_api_key = (
            str(data.get("fpt_api_key") or "").strip()
            or str(vp_cfg.get("fpt_api_key") or "").strip()
            or FPT_TTS_DEFAULT_KEY
        )
        fpt_speed = int(data.get("fpt_speed") or 0)

        fx_enabled = bool(data.get("fx_enabled", False))
        fx_params = {
            "pitch":   float(data.get("fx_pitch",  1.5)),
            "speed":   float(data.get("fx_speed",  1.08)),
            "bass":    float(data.get("fx_bass",   -2)),
            "mid":     float(data.get("fx_mid",    2)),
            "treble":  float(data.get("fx_treble", 3)),
            "comp":    str(data.get("fx_comp",     "none")),
            "reverb":  float(data.get("fx_reverb", 0)),
        }

        with tempfile.TemporaryDirectory(prefix="tts_preview_") as tmpdir:
            out_path = _Path(tmpdir) / "preview.mp3"
            try:
                if tts_engine == "gtts":
                    ok = _tts_gtts(text, "vi", out_path)
                elif tts_engine == "fpt-ai":
                    ok = asyncio.run(_tts_fpt_ai(text, tts_voice, out_path, fpt_api_key, fpt_speed))
                elif tts_engine == "minimax":
                    from core.video_processor import _tts_minimax
                    ok = asyncio.run(_tts_minimax(text, tts_voice, out_path))
                elif tts_engine == "huggingface":
                    from core.hf_tts import HuggingFaceTTS
                    cfg = load_cfg()
                    hf_cfg = cfg.get("huggingface") or {}
                    tr_cfg = cfg.get("translation") or {}
                    hf_token = (
                        str(hf_cfg.get("hf_token") or "").strip()
                        or str(tr_cfg.get("hf_token") or "").strip()
                        or os.getenv("HF_TOKEN", "").strip()
                    )
                    hf = HuggingFaceTTS(
                        hf_token=hf_token,
                        tts_model=str(data.get("hf_model") or hf_cfg.get("tts_model") or "facebook/mms-tts-vie"),
                        device=str(data.get("hf_device") or hf_cfg.get("device") or "cpu"),
                        speaker_embeddings_path=str(data.get("hf_embeddings") or hf_cfg.get("tts_speaker_embeddings") or ""),
                    )
                    ok_hf, err_hf = hf.synthesize(text, out_path)
                    if not ok_hf:
                        return jsonify({"ok": False, "error": err_hf}), 500
                    ok = ok_hf
                else:
                    ok = asyncio.run(_tts_edge(text, tts_voice, out_path, rate=tts_rate, pitch=tts_pitch, style=tts_emotion))
            except Exception as inner_e:
                return jsonify({"ok": False, "error": f"TTS generation failed: {str(inner_e)}"}), 500

            if not ok or (not out_path.exists()) or out_path.stat().st_size <= 0:
                return jsonify({"ok": False, "error": "Unable to synthesize preview audio (empty file)"}), 500

            if fx_enabled:
                from core.video_processor import find_ffmpeg, apply_audio_effects
                ffmpeg = find_ffmpeg()
                if ffmpeg:
                    fx_out = _Path(tmpdir) / "preview_fx.mp3"
                    try:
                        apply_audio_effects(
                            input_path=out_path,
                            output_path=fx_out,
                            ffmpeg=ffmpeg,
                            pitch_semitones=fx_params["pitch"],
                            speed=fx_params["speed"],
                            bass=int(fx_params["bass"]),
                            mid=int(fx_params["mid"]),
                            treble=int(fx_params["treble"]),
                            compression=fx_params["comp"],
                            reverb=int(fx_params["reverb"]),
                        )
                        if fx_out.exists() and fx_out.stat().st_size > 0:
                            out_path = fx_out
                    except Exception:
                        pass  # fallback to non-fx audio

            audio_data = io.BytesIO(out_path.read_bytes())
            audio_data.seek(0)
            return send_file(audio_data, mimetype="audio/mpeg", as_attachment=False, download_name="preview.mp3")
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/hf-tts/models", methods=["GET"])
def hf_tts_models():
    """Trả về danh sách các HuggingFace TTS model được hỗ trợ."""
    models = [
        {"id": "facebook/mms-tts-vie", "name": "MMS TTS Vietnamese", "language": "vi"},
        {"id": "facebook/mms-tts-eng", "name": "MMS TTS English", "language": "en"},
        {"id": "facebook/mms-tts-zho", "name": "MMS TTS Chinese", "language": "zh"},
        {"id": "microsoft/speecht5_tts", "name": "SpeechT5 TTS (cần speaker embeddings)", "language": "en"},
    ]
    return jsonify({"ok": True, "models": models})


# ── HF VOICES MANAGEMENT ───────────────────────────────────────────────────

VOICES_DIR = ROOT / "voices"
VOICES_DIR.mkdir(parents=True, exist_ok=True)

@app.route("/api/hf_voices", methods=["GET"])
def list_hf_voices():
    voices = []
    for f in VOICES_DIR.glob("*"):
        if f.suffix in (".npy", ".pt"):
            voices.append({"name": f.name, "path": str(f.absolute())})
    return jsonify({"ok": True, "voices": voices})

@app.route("/api/hf_voices/upload", methods=["POST"])
def upload_hf_voice():
    import tempfile
    from werkzeug.utils import secure_filename
    if "audio" not in request.files:
        return jsonify({"ok": False, "error": "No audio file uploaded"}), 400
    file = request.files["audio"]
    name = str(request.form.get("name") or "voice").strip()
    name = secure_filename(name)
    if not name: name = "voice"
    if not name.endswith(".npy"): name += ".npy"
    
    out_path = VOICES_DIR / name
    if out_path.exists():
        return jsonify({"ok": False, "error": "Tên giọng này đã tồn tại"}), 400
        
    try:
        import numpy as np
        import torch
        import torchaudio
        import os
        import sys
        import types
        # More aggressive mocking for SpeechBrain's lazy-loading of integrations on Windows
        mock_m = types.ModuleType('mock_m')
        sys.modules['k2'] = mock_m
        for sub in ['k2', 'k2_fsa', 'nlp']:
            sys.modules[f'speechbrain.integrations.{sub}'] = mock_m
        from speechbrain.inference.speaker import EncoderClassifier

        # Windows workaround for [WinError 1314] when creating symlinks without admin rights
        if os.name == "nt":
            import shutil
            if not hasattr(os, "_orig_symlink_patched"):
                os._orig_symlink_patched = True
                _orig_symlink = os.symlink
                def _force_copy_symlink(src, dst, target_is_directory=False, **kwargs):
                    try:
                        _orig_symlink(src, dst, target_is_directory=target_is_directory, **kwargs)
                    except OSError:
                        if target_is_directory:
                            shutil.copytree(src, dst, dirs_exist_ok=True)
                        else:
                            shutil.copy2(src, dst)
                os.symlink = _force_copy_symlink

        with tempfile.NamedTemporaryFile(suffix=".tmp", delete=False) as tmp_in:
            in_path = tmp_in.name
            file.save(in_path)
            
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
            wav_path = tmp_out.name
            
        try:
            from core.video_processor import find_ffmpeg
            ffmpeg = find_ffmpeg()
            import subprocess
            subprocess.run([ffmpeg, "-y", "-i", in_path, "-ar", "16000", "-ac", "1", wav_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            return jsonify({"ok": False, "error": f"Lỗi covert audio bằng ffmpeg: {e}"}), 400

        classifier = EncoderClassifier.from_hparams(source="speechbrain/spkrec-xvect-voxceleb", savedir="tmpdir")
        signal, fs = torchaudio.load(wav_path, backend="soundfile")
        if signal.shape[0] > 1:
            signal = torch.mean(signal, dim=0, keepdim=True)
            
        embeddings = classifier.encode_batch(signal)
        embeddings = embeddings.squeeze(1).detach().cpu().numpy()
        
        np.save(str(out_path), embeddings)
        
        try: 
            os.unlink(in_path)
            os.unlink(wav_path)
        except: pass

        return jsonify({"ok": True, "name": name, "path": str(out_path.absolute())})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/hf_voices/<name>", methods=["DELETE"])
def delete_hf_voice(name):
    from werkzeug.utils import secure_filename
    safe_name = secure_filename(name)
    target = VOICES_DIR / safe_name
    if target.exists() and target.is_file():
        try:
            target.unlink()
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500
    return jsonify({"ok": False, "error": "Not found"}), 404



@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    import tempfile
    import shutil
    from pathlib import Path as _Path

    data = {}
    if request.form:
        data.update(request.form.to_dict(flat=True))
    if request.is_json:
        data.update(request.get_json(silent=True) or {})

    uploaded_tmp_dir = None
    uploaded_file = request.files.get("video_file") if request.files else None
    if uploaded_file and uploaded_file.filename:
        from utils.validators import sanitize_filename
        uploaded_tmp_dir = _Path(tempfile.mkdtemp(prefix="tr_upload_"))
        original_name = _Path(uploaded_file.filename).name
        safe_name = sanitize_filename(_Path(original_name).stem) + _Path(original_name).suffix
        saved_path = uploaded_tmp_dir / safe_name
        uploaded_file.save(saved_path)
        data["single"] = str(saved_path)

    import json as _j
    from flask import Response, stream_with_context

    def generate():
        from cli.whisper_transcribe import find_ffmpeg, find_videos, transcribe_file
        from pathlib import Path as P
        import re

        def as_bool(value, default=False):
            if isinstance(value, bool):
                return value
            if value is None:
                return default
            txt = str(value).strip().lower()
            if txt in ("1", "true", "yes", "on"):
                return True
            if txt in ("0", "false", "no", "off", ""):
                return False
            return default

        def send(**kw): return _j.dumps(kw) + "\n"

        def ass_time_to_srt(t: str) -> str:
            # ASS: h:mm:ss.cs -> SRT: hh:mm:ss,mmm
            m = re.match(r"\s*(\d+):(\d+):(\d+)(?:\.(\d+))?\s*", str(t or ""))
            if not m:
                return "00:00:00,000"
            h = int(m.group(1))
            mm = int(m.group(2))
            ss = int(m.group(3))
            cs_raw = (m.group(4) or "0")[:2].ljust(2, "0")
            ms = int(cs_raw) * 10
            return f"{h:02d}:{mm:02d}:{ss:02d},{ms:03d}"

        def strip_ass_tags(text: str) -> str:
            txt = str(text or "")
            txt = re.sub(r"\{[^}]*\}", "", txt)
            txt = txt.replace(r"\N", "\n").replace(r"\n", "\n")
            return txt.strip()

        def convert_ass_to_outputs(ass_file: P, out_dir: str | None, export_srt: bool) -> tuple[bool, str]:
            ass_file = P(ass_file)
            if not ass_file.exists():
                return False, f"ASS file not found: {ass_file}"

            target_dir = P(out_dir) if out_dir else ass_file.parent
            target_dir.mkdir(parents=True, exist_ok=True)
            stem = ass_file.stem
            txt_path = target_dir / f"{stem}.transcript.txt"
            srt_path = target_dir / f"{stem}.transcript.srt"

            raw = ass_file.read_text(encoding="utf-8", errors="replace")
            dialogues = []
            for line in raw.splitlines():
                if not line.startswith("Dialogue:"):
                    continue
                content = line[len("Dialogue:"):].lstrip()
                parts = content.split(",", 9)
                if len(parts) < 10:
                    continue
                start = ass_time_to_srt(parts[1])
                end = ass_time_to_srt(parts[2])
                text = strip_ass_tags(parts[9])
                if text:
                    dialogues.append((start, end, text))

            if not dialogues:
                return False, "ASS has no dialogue lines"

            txt_path.write_text("\n".join([d[2] for d in dialogues]), encoding="utf-8")
            if export_srt:
                srt_blocks = []
                for i, (start, end, text) in enumerate(dialogues, 1):
                    srt_blocks.append(f"{i}\n{start} --> {end}\n{text}\n")
                srt_path.write_text("\n".join(srt_blocks), encoding="utf-8")

            return True, f"{txt_path.name}" + (f" + {srt_path.name}" if export_srt else "")

        try:
            ffmpeg = find_ffmpeg()
            if not ffmpeg:
                yield send(log="✗ ffmpeg not found", level="error"); return
            try:
                import whisper
            except ImportError:
                yield send(log="✗ pip install openai-whisper", level="error"); return

            converter = None
            if as_bool(data.get("sc"), False):
                try:
                    from opencc import OpenCC; converter = OpenCC("t2s")
                except ImportError:
                    yield send(log="⚠ OpenCC not installed", level="warning")

            single = (data.get("single") or "").strip()
            out_dir = (data.get("out_dir") or "").strip() or None
            export_srt = as_bool(data.get("srt"), False)

            if single and P(single).suffix.lower() == ".ass":
                yield send(log=f"ℹ Import ASS: {P(single).name}", level="info")
                yield send(overall=25, overall_lbl="Parsing ASS...", file=30, file_lbl="reading")
                ok, info = convert_ass_to_outputs(P(single), out_dir, export_srt)
                if ok:
                    yield send(log=f"✓ Converted ASS: {info}", level="success")
                    yield send(overall=100, overall_lbl="完成", file=100, file_lbl="done")
                else:
                    yield send(log=f"✗ {info}", level="error")
                return

            model_name = data.get("model","base")
            yield send(log=f"ℹ Loading model: {model_name}…")
            model = whisper.load_model(model_name)
            yield send(log=f"✓ Model {model_name} loaded", level="success")

            videos = [P(single)] if single else find_videos(
                data.get("folder","./Downloaded"),
                skip_existing=as_bool(data.get("skip"), True),
                output_dir=out_dir)

            if not videos:
                yield send(log="⚠ No videos found", level="warning"); return

            yield send(log=f"ℹ Found {len(videos)} video(s)")
            fmts = {"txt"}
            if export_srt: fmts.add("srt")
            ok_c = fail_c = 0

            for i, v in enumerate(videos, 1):
                yield send(log=f"▶ [{i}/{len(videos)}] {v.name}", level="url")
                yield send(overall=int((i-1)/len(videos)*100), overall_lbl=f"{i-1}/{len(videos)}", file=0, file_lbl="extracting…")
                try:
                    ok = transcribe_file(v, model, ffmpeg, fmts, data.get("lang","zh"), converter, out_dir)
                    if ok: ok_c+=1; yield send(log="✓ Done", level="success")
                    else:  fail_c+=1; yield send(log="✗ Failed", level="error")
                except Exception as e:
                    fail_c+=1; yield send(log=f"✗ {e}", level="error")
                pct = int(i/len(videos)*100)
                yield send(overall=pct, overall_lbl=f"{i}/{len(videos)}  ✓{ok_c} ✗{fail_c}", file=100, file_lbl="done")

            yield send(log=f"{'─'*40}", level="result")
            yield send(log=f"成功:{ok_c}  失败:{fail_c}", level="result")
            yield send(overall=100, overall_lbl="完成", file=100, file_lbl="")
        finally:
            if uploaded_tmp_dir:
                shutil.rmtree(uploaded_tmp_dir, ignore_errors=True)

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

@app.route("/api/extract_audio", methods=["POST"])
def extract_audio():
    """Extract audio track from a video file and save as MP3."""
    import tempfile, shutil
    from pathlib import Path as _Path
    from core.video_processor import find_ffmpeg, extract_audio_only

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        return jsonify({"ok": False, "error": "FFmpeg not found"}), 500

    uploaded_file = request.files.get("video_file") if request.files else None
    video_path = None
    tmp_dir = None

    data = {}
    if request.form:
        data.update(request.form.to_dict(flat=True))
    if request.is_json:
        data.update(request.get_json(silent=True) or {})

    if uploaded_file and uploaded_file.filename:
        tmp_dir = _Path(tempfile.mkdtemp(prefix="extract_upload_"))
        video_path = tmp_dir / uploaded_file.filename
        uploaded_file.save(str(video_path))
        if not str(data.get("output_dir") or "").strip():
            data["output_dir"] = str(ROOT / "Downloaded")
    else:
        video_path = _Path(str(data.get("video_path") or "").strip())

    if not video_path or not video_path.exists():
        return jsonify({"ok": False, "error": "Video file not found"}), 400

    output_dir = str(data.get("output_dir") or "").strip()
    if output_dir:
        out_dir = _Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / (video_path.stem + ".mp3")
    else:
        out_path = video_path.with_suffix(".mp3")

    ok, err = extract_audio_only(video_path, out_path, ffmpeg)

    if tmp_dir:
        try:
            shutil.rmtree(str(tmp_dir), ignore_errors=True)
        except Exception:
            pass

    if ok:
        return jsonify({"ok": True, "output_path": str(out_path)})
    return jsonify({"ok": False, "error": err}), 500


@app.route("/api/tts_from_ass", methods=["POST"])
def tts_from_ass():
    """Generate a combined TTS MP3 from an .ass subtitle file — streaming NDJSON log."""
    import tempfile, shutil, asyncio as _asyncio
    from pathlib import Path as _Path
    from flask import Response, stream_with_context
    from core.video_processor import (
        find_ffmpeg, MultiProviderTTS,
        FPT_TTS_DEFAULT_KEY, _parse_ass_file, run_ffmpeg as _run_ffmpeg,
    )

    uploaded_file = request.files.get("ass_file") if request.files else None
    data = {}
    if request.form:
        data.update(request.form.to_dict(flat=True))
    if request.is_json:
        data.update(request.get_json(silent=True) or {})

    ass_path = None
    tmp_upload_dir = None

    if uploaded_file and uploaded_file.filename:
        tmp_upload_dir = _Path(tempfile.mkdtemp(prefix="tts_ass_upload_"))
        ass_path = tmp_upload_dir / uploaded_file.filename
        uploaded_file.save(str(ass_path))
        # When file is uploaded, default output_dir to Downloaded folder
        # so MP3 is not lost when temp dir is cleaned up
        if not str(data.get("output_dir") or "").strip():
            data["output_dir"] = str(ROOT / "Downloaded")
    else:
        ass_path = _Path(str(data.get("ass_path") or "").strip())

    tts_engine  = str(data.get("tts_engine")  or "edge-tts").lower()
    tts_voice   = str(data.get("tts_voice")   or "vi-VN-HoaiMyNeural")
    tts_pitch   = str(data.get("tts_pitch")   or "+0Hz")
    tts_rate    = str(data.get("tts_rate")    or "+0%")
    tts_emotion = str(data.get("tts_emotion") or "default")
    fx_enabled  = str(data.get("fx_enabled")  or "false").lower() in ("true", "1")
    fx_params = {
        "pitch":       float(data.get("fx_pitch")   or 1.5),
        "speed":       float(data.get("fx_speed")   or 1.08),
        "bass":        int(float(data.get("fx_bass")    or -2)),
        "mid":         int(float(data.get("fx_mid")     or 2)),
        "treble":      int(float(data.get("fx_treble")  or 3)),
        "compression": str(data.get("fx_comp")    or "light"),
        "reverb":      int(float(data.get("fx_reverb")  or 5)),
    }
    output_dir = str(data.get("output_dir") or "").strip()

    cfg = load_cfg()
    vp_cfg = cfg.get("video_process") or {}
    fpt_api_key = (
        str(data.get("fpt_api_key") or "").strip()
        or str(vp_cfg.get("fpt_api_key") or "").strip()
        or FPT_TTS_DEFAULT_KEY
    )

    def _emit(log_lines: list, msg: str, level: str = "info", pct: int = None):
        log_lines.append(f"[{level.upper()}] {msg}")
        payload = {"log": msg, "level": level}
        if pct is not None:
            payload["overall"] = pct
            payload["overall_lbl"] = msg
        return json.dumps(payload, ensure_ascii=False) + "\n"

    def generate():
        log_lines = []
        ffmpeg = find_ffmpeg()

        if not ffmpeg:
            yield _emit(log_lines, "FFmpeg không tìm thấy.", "error", 0)
            return

        if not ass_path or not ass_path.exists():
            yield _emit(log_lines, f"File .ass không tồn tại: {ass_path}", "error", 0)
            return

        # Resolve output dir
        if output_dir:
            out_dir = _Path(output_dir)
            out_dir.mkdir(parents=True, exist_ok=True)
        else:
            out_dir = ass_path.parent

        out_mp3 = out_dir / (ass_path.stem + "_tts.mp3")
        log_file = out_dir / (ass_path.stem + "_tts.log")

        yield _emit(log_lines, f"📂 File ASS: {ass_path}", "info", 0)
        yield _emit(log_lines, f"📁 Thư mục xuất: {out_dir}", "info", 2)

        try:
            segments = _parse_ass_file(ass_path)
            if not segments:
                yield _emit(log_lines, "Không tìm thấy dialogue trong file .ass", "error", 0)
                return

            yield _emit(log_lines, f"✅ Đọc được {len(segments)} đoạn từ file .ass", "info", 5)

            with tempfile.TemporaryDirectory(prefix="tts_ass_") as tmpdir:
                tmpdir = _Path(tmpdir)
                tts = MultiProviderTTS(
                    voice=tts_voice, engine=tts_engine,
                    fpt_api_key=fpt_api_key, fpt_speed=0,
                    pitch=tts_pitch, rate=tts_rate, style=tts_emotion,
                )
                translations = [s.get("text", "") for s in segments]

                yield _emit(log_lines, f"🎙 Bắt đầu tổng hợp giọng ({tts_engine}, {tts_voice})...", "info", 10)

                clips = _asyncio.run(tts.generate_all(
                    segments, translations, tmpdir,
                    max_concurrency=2, retries=2,
                    tts_speed=1.0, auto_speed=False, ffmpeg=ffmpeg,
                    fx_enabled=fx_enabled, fx_params=fx_params,
                ))

                if not clips:
                    yield _emit(log_lines, "Không tạo được clip TTS nào.", "error", 0)
                    return

                yield _emit(log_lines, f"✅ Tổng hợp xong {len(clips)} clip", "info", 70)

                if fx_enabled:
                    yield _emit(log_lines, "🎛 Đã áp dụng hiệu ứng FX vào từng clip", "info", 75)

                # Concat
                yield _emit(log_lines, "🔗 Đang ghép các clip thành file MP3...", "info", 80)
                concat_list = tmpdir / "concat.txt"
                with open(str(concat_list), "w", encoding="utf-8") as f:
                    for c in clips:
                        f.write(f"file '{str(c['path']).replace(chr(92), '/')}'\n")

                ok, err = _run_ffmpeg([
                    ffmpeg, "-f", "concat", "-safe", "0",
                    "-i", str(concat_list),
                    "-c:a", "libmp3lame", "-b:a", "128k",
                    str(out_mp3), "-y", "-loglevel", "error"
                ])

                if not ok:
                    yield _emit(log_lines, f"❌ Ghép MP3 thất bại: {err}", "error", 0)
                    return

            yield _emit(log_lines, f"✅ Hoàn thành! File MP3: {out_mp3}", "success", 100)
            yield json.dumps({"ok": True, "output_path": str(out_mp3), "clips": len(clips)}, ensure_ascii=False) + "\n"

        except Exception as exc:
            LOGGER.exception("tts_from_ass error")
            yield _emit(log_lines, f"❌ Lỗi: {exc}", "error", 0)
        finally:
            # Write log file
            try:
                with open(str(log_file), "w", encoding="utf-8") as lf:
                    lf.write(f"=== TTS from ASS — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
                    lf.write(f"ASS: {ass_path}\n")
                    lf.write(f"Engine: {tts_engine} | Voice: {tts_voice} | FX: {fx_enabled}\n\n")
                    lf.write("\n".join(log_lines))
                    lf.write("\n")
            except Exception:
                pass
            if tmp_upload_dir:
                shutil.rmtree(str(tmp_upload_dir), ignore_errors=True)

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")


@app.route("/api/upload_anti_fp_image", methods=["POST"])
def upload_anti_fp_image():
    """Upload an overlay / logo image for anti-fingerprint processing."""
    import shutil
    from pathlib import Path as _Path
    from utils.validators import sanitize_filename

    upload_file = request.files.get("file") if request.files else None
    if not upload_file or not upload_file.filename:
        return jsonify({"ok": False, "error": "No file provided"}), 400

    img_type = str(request.form.get("type") or "overlay")
    safe_name = sanitize_filename(upload_file.filename)
    upload_dir = ROOT / "temp_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    save_path = upload_dir / f"anti-fp-{img_type}-{safe_name}"
    upload_file.save(str(save_path))

    return jsonify({"ok": True, "path": str(save_path)})


@app.route("/api/process_video", methods=["POST"])
def process_video():
    import tempfile
    from pathlib import Path as _Path
    import json as _j
    from flask import Response, stream_with_context

    data = {}
    if request.form:
        data.update(request.form.to_dict(flat=True))
    if request.is_json:
        data.update(request.get_json(silent=True) or {})

    uploaded_file = request.files.get("video_file") if request.files else None
    if uploaded_file and uploaded_file.filename:
        from utils.validators import sanitize_filename
        upload_dir = _Path(tempfile.mkdtemp(prefix="proc_upload_"))
        original_name = _Path(uploaded_file.filename).name
        safe_name = sanitize_filename(_Path(original_name).stem) + _Path(original_name).suffix
        saved_path = upload_dir / safe_name
        uploaded_file.save(saved_path)
        data["video_path"] = str(saved_path)
        data["video_file_name"] = original_name

    def generate():
        from config import ConfigLoader
        from auth import CookieManager
        from core import DouyinAPIClient, URLParser
        from core.video_downloader import VideoDownloader
        from control import QueueManager, RateLimiter, RetryHandler
        from storage import FileManager
        from core.video_processor import process_video_full

        async def _download_video_from_url(video_url: str, out_dir: str) -> Path:
            import re
            from urllib.parse import urlparse, parse_qs

            def _pick_url(raw: str) -> str:
                text = str(raw or "").strip()
                if not text:
                    return ""
                m = re.search(r"https?://[^\s]+", text)
                if m:
                    return m.group(0).rstrip("\"'.,;)")
                if text.startswith("v.douyin.com/") or text.startswith("www.douyin.com/"):
                    return "https://" + text
                return text

            def _extract_aweme_id(url: str, parsed_url: dict | None) -> str:
                if parsed_url:
                    aid = str(parsed_url.get("aweme_id") or "").strip()
                    if aid:
                        return aid

                qs = parse_qs(urlparse(url).query or "")
                for key in ("modal_id", "item_id", "group_id", "aweme_id"):
                    val = str((qs.get(key) or [""])[0]).strip()
                    if val.isdigit():
                        return val

                m = re.search(r"/(?:video|note|gallery|slides|share/video)/(\d{15,20})", url)
                if m:
                    return m.group(1)
                return ""

            cfg = ConfigLoader(str(CONFIG_FILE))
            cm = CookieManager()
            cm.set_cookies(get_cookies_with_fallback())
            if not cm.validate_cookies():
                raise RuntimeError("Cookies may be invalid")

            async with DouyinAPIClient(cm.get_cookies(), proxy=cfg.get("proxy")) as api:
                normalized_url = _pick_url(video_url)
                if not normalized_url:
                    raise RuntimeError("URL is empty")

                resolved_url = normalized_url
                if "v.douyin.com" in resolved_url:
                    redirected = await api.resolve_short_url(resolved_url)
                    if redirected:
                        resolved_url = redirected

                parsed = URLParser.parse(resolved_url)
                aweme_id = _extract_aweme_id(resolved_url, parsed)
                if not aweme_id:
                    # Some redirects may drop modal_id/item_id query params.
                    aweme_id = _extract_aweme_id(normalized_url, URLParser.parse(normalized_url))
                if not aweme_id:
                    raise RuntimeError("Invalid video URL. Please use a specific Douyin post link.")

                if parsed and parsed.get("type") not in ("video", "gallery") and not aweme_id:
                    raise RuntimeError("URL is not a video post")

                aweme_data = await api.get_video_detail(aweme_id)
                if not aweme_data:
                    raise RuntimeError("Failed to fetch video detail")

                raw_title = str(aweme_data.get("desc") or "video").strip() or "video"
                resolved_title = _resolve_naming_title(raw_title)

                out_path = Path(out_dir).expanduser() if out_dir else Path(cfg.get("path") or "./Downloaded")
                file_manager = FileManager(str(out_path))
                downloader = VideoDownloader(
                    config=cfg,
                    api_client=api,
                    file_manager=file_manager,
                    cookie_manager=cm,
                    database=None,
                    rate_limiter=RateLimiter(max_per_second=float(cfg.get("rate_limit", 5) or 5)),
                    retry_handler=RetryHandler(max_retries=int(cfg.get("retry_times", 3) or 3)),
                    queue_manager=QueueManager(max_workers=1),
                    progress_reporter=None,
                )

                if downloader._detect_media_type(aweme_data) != "video":
                    raise RuntimeError("URL is not a video post")

                play_info = downloader._build_no_watermark_url(aweme_data)
                if not play_info:
                    raise RuntimeError("No playable video URL found")

                play_url, headers = play_info
                from utils.validators import sanitize_filename

                base_name = sanitize_filename(f"{resolved_title}_{aweme_id}")
                save_dir = out_path
                save_dir.mkdir(parents=True, exist_ok=True)
                save_path = save_dir / f"{base_name}.mp4"

                if save_path.exists():
                    save_path = save_dir / f"{base_name}_{int(time.time())}.mp4"

                session = await api.get_session()
                ok = await file_manager.download_file(
                    play_url,
                    save_path,
                    session,
                    headers=headers,
                    proxy=api.proxy,
                )
                if not ok or not save_path.exists():
                    raise RuntimeError("Download failed")

                return save_path.resolve(), resolved_title

        try:
            req = dict(data or {})
            video_path = str(req.get("video_path") or "").strip()
            video_url = str(req.get("video_url") or "").strip()
            req.setdefault("cleanup_outputs", True)
            req.setdefault("delete_source_after_process", False)

            if not video_path and video_url:
                yield _j.dumps({"log": f"Resolving URL: {video_url}", "level": "info"}, ensure_ascii=False) + "\n"
                yield _j.dumps({"overall": 2, "overall_lbl": "Resolving URL..."}, ensure_ascii=False) + "\n"
                try:
                    downloaded_path, downloaded_title = asyncio.run(_download_video_from_url(video_url, str(req.get("out_dir") or "").strip()))
                    req["video_path"] = str(downloaded_path)
                    req["video_title"] = downloaded_title
                    req["delete_source_after_process"] = True
                    yield _j.dumps({"log": f"Downloaded video: {downloaded_path}", "level": "success"}, ensure_ascii=False) + "\n"
                    yield _j.dumps({"overall": 4, "overall_lbl": "Download done, start processing..."}, ensure_ascii=False) + "\n"
                except Exception as e:
                    yield _j.dumps({"log": f"URL download failed: {e}", "level": "error"}, ensure_ascii=False) + "\n"
                    yield _j.dumps({"overall": 0, "overall_lbl": "Error"}, ensure_ascii=False) + "\n"
                    return
            elif not video_path:
                yield _j.dumps({"log": "Please provide video_path or video_url", "level": "error"}, ensure_ascii=False) + "\n"
                yield _j.dumps({"overall": 0, "overall_lbl": "Error"}, ensure_ascii=False) + "\n"
                return

            for line in process_video_full(req):
                yield line
        except Exception as e:
            yield _j.dumps({"log": f"Fatal error: {e}", "level": "error"}, ensure_ascii=False) + "\n"
            yield _j.dumps({"overall": 0, "overall_lbl": "Error"}, ensure_ascii=False) + "\n"

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")


@app.route("/api/auto_fetch_cookie", methods=["POST"])
def auto_fetch_cookie():
    def run():
        import argparse
        from tools.cookie_fetcher import capture_cookies
        args = argparse.Namespace(
            url="https://www.douyin.com/", browser="chromium",
            headless=False, output=ROOT/"config"/"cookies.json",
            config=CONFIG_FILE, include_all=False)
        asyncio.run(capture_cookies(args))
    threading.Thread(target=run, daemon=True).start()
    return jsonify({"ok": True})

@app.route("/api/upload-image", methods=["POST"])
def upload_image():
    """Upload ảnh cho anti-fingerprint (overlay/logo)"""
    import uuid
    if 'file' not in request.files:
        return jsonify({"ok": False, "error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"ok": False, "error": "No file selected"}), 400
    
    # Kiểm tra loại file
    allowed_ext = {'.png', '.jpg', '.jpeg', '.webp'}
    fname = file.filename.lower()
    if not any(fname.endswith(ext) for ext in allowed_ext):
        return jsonify({"ok": False, "error": "Only image files allowed (PNG, JPG, JPEG, WEBP)"}), 400
    
    try:
        # Tạo thư mục temp_uploads nếu chưa có
        upload_dir = ROOT / "temp_uploads"
        upload_dir.mkdir(exist_ok=True)
        
        # Lưu file với UUID để tránh trùng lặp
        ext = Path(file.filename).suffix
        new_filename = f"anti-fp-{uuid.uuid4().hex}{ext}"
        upload_path = upload_dir / new_filename
        file.save(str(upload_path))
        
        # Trả về path tương đối để backend có thể tìm
        rel_path = f"temp_uploads/{new_filename}"
        return jsonify({"ok": True, "path": rel_path})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/browse-file", methods=["POST"])
def browse_file():
    import subprocess, sys, json as _json
    data = request.get_json(silent=True) or {}
    file_filter = data.get('filter', 'all')

    if file_filter == 'image':
        filetypes_arg = "image"
    else:
        filetypes_arg = "all"

    script = """
import tkinter as tk
from tkinter import filedialog
import sys, json

ft = sys.argv[1] if len(sys.argv) > 1 else 'all'
root = tk.Tk()
root.withdraw()
root.lift()
root.attributes('-topmost', True)

if ft == 'image':
    filetypes = [('Image files', '*.png *.jpg *.jpeg *.webp'), ('All files', '*.*')]
else:
    filetypes = [('All files', '*.*')]

path = filedialog.askopenfilename(filetypes=filetypes)
root.destroy()
print(json.dumps({'path': path or ''}))
"""

    try:
        result = subprocess.run(
            [sys.executable, "-c", script, filetypes_arg],
            capture_output=True, text=True, timeout=120
        )
        out = result.stdout.strip()
        data_out = _json.loads(out) if out else {"path": ""}
        return jsonify(data_out)
    except Exception as e:
        return jsonify({"path": "", "error": str(e)})


def _preload_whisper_model():
    """Preload faster-whisper model in background so first video processes faster."""
    try:
        import os
        os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
        cfg = load_cfg()
        model_name = (cfg.get("video_process") or {}).get("model", "base")
        from core.video_processor import _whisper_model_cache
        if model_name not in _whisper_model_cache:
            from faster_whisper import WhisperModel
            _whisper_model_cache[model_name] = WhisperModel(model_name, device="cpu", compute_type="int8")
    except Exception:
        pass

def _preload_hf_tts_model():
    """Preload HuggingFace TTS model in background if selected, so first preview is fast."""
    try:
        from core.hf_tts import HuggingFaceTTS
        import os
        cfg = load_cfg()
        vp_cfg = cfg.get("video_process") or {}
        tr_cfg = cfg.get("translation") or {}
        hf_cfg = cfg.get("huggingface") or {}
        
        hf_token = (
            str(hf_cfg.get("hf_token") or "").strip()
            or str(tr_cfg.get("hf_token") or "").strip()
            or os.getenv("HF_TOKEN", "").strip()
        )
        tts_model = str(hf_cfg.get("tts_model") or "facebook/mms-tts-vie")
        device = str(hf_cfg.get("device") or "cpu")
        embeddings = str(hf_cfg.get("tts_speaker_embeddings") or "")
        
        # Load the model in background to trigger the download or ram allocation
        hf = HuggingFaceTTS(
            hf_token=hf_token,
            tts_model=tts_model,
            device=device,
            speaker_embeddings_path=embeddings
        )
        hf._load_model()
        if hf._is_speecht5():
            hf._load_speaker_embeddings()
    except Exception:
        pass


# ── YouTube Upload ─────────────────────────────────────────────────────────
_youtube_uploader = None

def _get_youtube_uploader():
    global _youtube_uploader
    if _youtube_uploader is None:
        from tools.youtube_uploader import YouTubeUploader
        _youtube_uploader = YouTubeUploader(client_secrets_file="client_secrets.json")
    return _youtube_uploader

@app.route("/api/youtube_auth", methods=["GET", "POST"])
def youtube_auth():
    """Get YouTube OAuth URL or handle OAuth callback."""
    try:
        uploader = _get_youtube_uploader()

        if request.method == "POST":
            # Start a fresh OAuth flow and return auth URL for frontend popup.
            uploader.revoke_auth()
            auth_url = uploader.get_auth_url()
            if auth_url:
                return jsonify({"ok": True, "authenticated": False, "auth_url": auth_url})
            err_msg = str(getattr(uploader, "last_error", "") or "").strip()
            return jsonify({
                "ok": False,
                "authenticated": False,
                "error_code": "auth_failed",
                "error": err_msg or "Unable to start OAuth flow"
            }), 401

        # GET: Return auth URL or status
        if uploader.authenticate():
            channel = uploader.get_channel_info()
            return jsonify({"ok": True, "authenticated": True, "channel": channel})

        auth_url = uploader.get_auth_url()
        if not auth_url:
            err_msg = str(getattr(uploader, "last_error", "") or "").strip()
            return jsonify({
                "ok": False,
                "authenticated": False,
                "error_code": "auth_url_unavailable",
                "error": err_msg or "client_secrets.json not found"
            }), 400

        return jsonify({"ok": True, "authenticated": False, "auth_url": auth_url})
    except ModuleNotFoundError as e:
        app.logger.exception("youtube_auth missing dependency")
        return jsonify({
            "ok": False,
            "authenticated": False,
            "error_code": "missing_dependency",
            "error": f"Missing dependency: {e}"
        }), 500
    except FileNotFoundError as e:
        app.logger.exception("youtube_auth missing file")
        return jsonify({
            "ok": False,
            "authenticated": False,
            "error_code": "missing_file",
            "error": str(e)
        }), 400
    except Exception as e:
        app.logger.exception("youtube_auth failed")
        return jsonify({
            "ok": False,
            "authenticated": False,
            "error_code": "internal_error",
            "error": f"YouTube auth error: {e}"
        }), 500


@app.route("/oauth2callback", methods=["GET"])
def youtube_oauth2_callback():
        """Handle Google OAuth callback and close popup window."""
        uploader = _get_youtube_uploader()
        state = str(request.args.get("state") or "")
        ok = uploader.complete_auth_callback(request.url, state=state)
        if ok:
                return """
<!doctype html>
<html><head><meta charset="utf-8"><title>YouTube Connected</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;line-height:1.5;">
    <h3>YouTube connected successfully.</h3>
    <p>You can close this window and return to the app.</p>
    <script>
        try { window.close(); } catch (e) {}
    </script>
</body></html>
"""

        err = str(getattr(uploader, "last_error", "") or "OAuth callback failed")
        return f"""
<!doctype html>
<html><head><meta charset=\"utf-8\"><title>YouTube OAuth Error</title></head>
<body style=\"font-family:Arial,sans-serif;padding:24px;line-height:1.5;\">
    <h3>Failed to connect YouTube.</h3>
    <p>{err}</p>
    <p>Please close this window and click \"Đăng nhập YouTube\" again.</p>
</body></html>
""", 400

@app.route("/api/youtube_channel", methods=["GET"])
def youtube_channel():
    """Get authenticated YouTube channel info."""
    uploader = _get_youtube_uploader()
    if not uploader.credentials:
        if not uploader.authenticate():
            return jsonify({"ok": False, "error": "Not authenticated"}), 401
    
    channel = uploader.get_channel_info()
    if channel:
        return jsonify({"ok": True, "channel": channel})
    return jsonify({"ok": False, "error": "Failed to fetch channel"}), 500

@app.route("/api/youtube_upload", methods=["POST"])
def youtube_upload():
    """Upload video to YouTube."""
    from pathlib import Path as _Path
    import json as _j
    from flask import Response, stream_with_context
    
    # Handle both JSON and FormData requests
    is_temp_file = False
    if request.is_json:
        data = request.json or {}
        video_path = str(data.get("video_path") or "").strip()
        title = str(data.get("title") or "").strip()
        description = str(data.get("description") or "").strip()
        tags = data.get("tags") or []
        privacy_status = str(data.get("privacy_status") or "private").strip().lower()
        is_short = bool(data.get("is_short", False))
    else:
        # Handle FormData
        video_file = request.files.get("video_file")
        if video_file:
            # Save the uploaded file temporarily
            temp_dir = _Path("temp_uploads")
            temp_dir.mkdir(exist_ok=True)
            video_path = temp_dir / video_file.filename
            video_file.save(str(video_path))
            is_temp_file = True
        else:
            video_path = str(request.form.get("video_path") or "").strip()
        
        title = str(request.form.get("title") or "").strip()
        description = str(request.form.get("description") or "").strip()
        tags_str = request.form.get("tags") or "[]"
        try:
            tags = _j.loads(tags_str)
        except:
            tags = []
        privacy_status = str(request.form.get("privacy_status") or "private").strip().lower()
        is_short = request.form.get("is_short", "false").lower() in ("true", "1", "yes")

    if not title and video_path:
        title = _Path(video_path).stem
    
    if not video_path or not title:
        return jsonify({"ok": False, "error": "Missing video_path or title"}), 400
    
    video_path = _Path(video_path)
    if not video_path.exists():
        return jsonify({"ok": False, "error": f"Video not found: {video_path}"}), 404
    
    uploader = _get_youtube_uploader()
    if not uploader.credentials:
        if not uploader.authenticate():
            return jsonify({"ok": False, "error": "Not authenticated with YouTube"}), 401
    
    def generate():
        def send(**kw):
            return _j.dumps(kw, ensure_ascii=False) + "\n"
        
        def on_progress(status):
            yield send(**status)
        
        try:
            yield send(log="[YouTube] Bắt đầu upload...", level="info")
            result = uploader.upload_video(
                video_path=video_path,
                title=title,
                description=description,
                tags=tags,
                privacy_status=privacy_status,
                is_short=is_short,
                on_progress=on_progress
            )
            
            if result:
                yield send(
                    log=f"[YouTube] ✓ Upload thành công! {result['url']}",
                    level="success",
                    video_id=result['id'],
                    url=result['url']
                )
            else:
                yield send(log="[YouTube] ✗ Upload thất bại", level="error")
        except Exception as e:
            yield send(log=f"[YouTube] ✗ Lỗi: {str(e)}", level="error")
        finally:
            # Clean up temp file if it was uploaded
            if is_temp_file and video_path.exists():
                try:
                    video_path.unlink()
                except:
                    pass
    
    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

@app.route("/api/youtube_logout", methods=["POST"])
def youtube_logout():
    """Logout from YouTube (revoke token)."""
    uploader = _get_youtube_uploader()
    if uploader.revoke_auth():
        return jsonify({"ok": True, "message": "Logged out from YouTube"})
    return jsonify({"ok": False, "error": "Failed to logout"}), 500


@app.route("/api/make_vertical_video", methods=["POST"])
def make_vertical_video_route():
    """Chuyển video ngang → dọc 9:16 với 2 lớp mờ gradient đổ bóng trên/dưới."""
    from core.video_processor import make_vertical_video, find_ffmpeg

    data = request.json or {}
    video_path = data.get("video_path", "").strip()
    if not video_path:
        return jsonify({"ok": False, "error": "Thiếu video_path"}), 400

    from pathlib import Path as _Path
    vp = _Path(video_path).expanduser()
    if not vp.exists():
        return jsonify({"ok": False, "error": f"File không tồn tại: {vp}"}), 404

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        return jsonify({"ok": False, "error": "ffmpeg không tìm thấy"}), 500

    out_dir = _Path(data.get("out_dir", "")).expanduser() if data.get("out_dir") else vp.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / f"{vp.stem}_vertical.mp4"

    ok, err = make_vertical_video(
        video_path=vp,
        output_path=output_path,
        ffmpeg=ffmpeg,
        target_w=int(data.get("target_w", 1080)),
        target_h=int(data.get("target_h", 1920)),
        blur_height_pct=float(data.get("blur_height_pct", 0.18)),
        blur_strength=int(data.get("blur_strength", 40)),
        shadow_opacity=float(data.get("shadow_opacity", 0.55)),
    )

    if ok:
        return jsonify({"ok": True, "output_path": str(output_path.resolve())})
    return jsonify({"ok": False, "error": err}), 500


if __name__ == "__main__":
    import webbrowser, time
    APP_HOST = "127.0.0.1"
    APP_PORT = 8080
    _start_ngrok_tunnel(APP_PORT)
    if _NGROK_PUBLIC_URL:
        print(f"[ngrok] Public URL: {_NGROK_PUBLIC_URL}")
        print(f"[ngrok] TikTok callback: {_NGROK_PUBLIC_URL}/api/tiktok/callback")
    elif _NGROK_ERROR:
        print(f"[ngrok] Error: {_NGROK_ERROR}")
    threading.Thread(target=_preload_whisper_model, daemon=True).start()
    threading.Thread(target=_preload_hf_tts_model, daemon=True).start()
    threading.Timer(1.2, lambda: webbrowser.open(f"http://localhost:{APP_PORT}")).start()
    socketio.run(app, host=APP_HOST, port=APP_PORT, debug=False)
