#!/usr/bin/env python3
"""Douyin Downloader — Flask Web UI"""
import asyncio, sys, time, threading, json, logging
from pathlib import Path
from datetime import datetime
import yaml
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
CONFIG_FILE = ROOT / "config.yml"

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
    cfg.update(data)
    save_cfg(cfg)
    return jsonify({"ok": True})

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
            result = await api.get_user_post(sec_uid, max_cursor=cursor, count=count)
            items  = result.get("items") or result.get("aweme_list") or []
            return {
                "videos":      parse_items(items),
                "has_more":    result.get("has_more", False),
                "next_cursor": result.get("max_cursor", 0),
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
        from config import ConfigLoader
        from auth import CookieManager
        from core import DouyinAPIClient, URLParser
        config = ConfigLoader(str(CONFIG_FILE))
        cm = CookieManager(); cm.set_cookies(get_cookies_with_fallback())
        parsed = URLParser.parse(url)
        if not parsed or parsed.get("type") != "user":
            return None, None
        sec_uid = parsed.get("sec_uid","")
        async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
            info = await api.get_user_info(sec_uid)
            posts = await api.get_user_post(sec_uid, count=20)
            return info, posts
    try:
        info, posts = asyncio.run(fetch())
        if not info:
            return jsonify({"error":"User not found or invalid URL"}), 404

        # parse video previews
        videos = []
        for item in (posts or {}).get("items", [])[:20]:
            cover = ""
            vc = item.get("video",{}).get("cover") or item.get("video",{}).get("origin_cover") or {}
            urls = vc.get("url_list") or []
            if urls: cover = urls[0]
            # gallery fallback
            if not cover:
                imgs = item.get("images") or []
                if imgs:
                    ul = (imgs[0].get("url_list") or [])
                    if ul: cover = ul[0]
            ts = item.get("create_time",0)
            dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""
            duration = (item.get("video") or {}).get("duration", 0) or \
                       (item.get("video") or {}).get("video_duration", 0) or \
                       item.get("duration", 0) or 0
            videos.append({
                "aweme_id": item.get("aweme_id",""),
                "desc":     (item.get("desc","") or "")[:60],
                "cover":    cover,
                "date":     dt,
                "ts":       ts,
                "play":     item.get("statistics",{}).get("play_count",0),
                "like":     item.get("statistics",{}).get("digg_count",0),
                "type":     "gallery" if item.get("images") else "video",
                "duration": duration,
            })

        return jsonify({
            "nickname":    info.get("nickname",""),
            "uid":         info.get("uid",""),
            "sec_uid":     info.get("sec_uid",""),
            "signature":   info.get("signature",""),
            "avatar":      ((info.get("avatar_thumb") or {}).get("url_list") or [""])[0],
            "follower":    info.get("follower_count",0),
            "following":   info.get("following_count",0),
            "aweme_count": info.get("aweme_count",0),
            "videos":      videos,
            "has_more":    posts.get("has_more", False),
            "next_cursor": posts.get("max_cursor", 0),
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
                    "keep_bg_music": bool(post_process.get("keep_bg_music", False)),
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

@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    data = request.json or {}
    import json as _j
    from flask import Response, stream_with_context

    def generate():
        from cli.whisper_transcribe import find_ffmpeg, find_videos, transcribe_file
        from pathlib import Path as P

        def send(**kw): return _j.dumps(kw) + "\n"

        ffmpeg = find_ffmpeg()
        if not ffmpeg:
            yield send(log="✗ ffmpeg not found", level="error"); return
        try:
            import whisper
        except ImportError:
            yield send(log="✗ pip install openai-whisper", level="error"); return

        converter = None
        if data.get("sc"):
            try:
                from opencc import OpenCC; converter = OpenCC("t2s")
            except ImportError:
                yield send(log="⚠ OpenCC not installed", level="warning")

        model_name = data.get("model","base")
        yield send(log=f"ℹ Loading model: {model_name}…")
        model = whisper.load_model(model_name)
        yield send(log=f"✓ Model {model_name} loaded", level="success")

        single = (data.get("single") or "").strip()
        videos = [P(single)] if single else find_videos(
            data.get("folder","./Downloaded"),
            skip_existing=data.get("skip",True),
            output_dir=data.get("out_dir") or None)

        if not videos:
            yield send(log="⚠ No videos found", level="warning"); return

        yield send(log=f"ℹ Found {len(videos)} video(s)")
        fmts = {"txt"}
        if data.get("srt"): fmts.add("srt")
        out_dir = (data.get("out_dir") or "").strip() or None
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

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

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

                desc = (aweme_data.get("desc") or "").strip() or "video"
                base_name = sanitize_filename(f"{desc}_{aweme_id}")
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

                return save_path.resolve()

        try:
            req = dict(data or {})
            video_path = str(req.get("video_path") or "").strip()
            video_url = str(req.get("video_url") or "").strip()

            if not video_path and video_url:
                yield _j.dumps({"log": f"Resolving URL: {video_url}", "level": "info"}, ensure_ascii=False) + "\n"
                yield _j.dumps({"overall": 2, "overall_lbl": "Resolving URL..."}, ensure_ascii=False) + "\n"
                try:
                    downloaded_path = asyncio.run(_download_video_from_url(video_url, str(req.get("out_dir") or "").strip()))
                    req["video_path"] = str(downloaded_path)
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


if __name__ == "__main__":
    import webbrowser, time
    threading.Thread(target=_preload_whisper_model, daemon=True).start()
    threading.Timer(1.2, lambda: webbrowser.open("http://localhost:5003")).start()
    socketio.run(app, host="0.0.0.0", port=5003, debug=False)
