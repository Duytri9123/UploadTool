#!/usr/bin/env python3
"""Douyin Downloader — Web UI (Gradio)"""
import asyncio, sys, threading, json
from pathlib import Path
import yaml, gradio as gr

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
CONFIG_FILE = ROOT / "config.yml"

# ── helpers ───────────────────────────────────────────────────────────────────
def load_cfg():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}

def save_cfg(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        yaml.dump(cfg, f, allow_unicode=True, default_flow_style=False)

# ── GUIProgress → yield log lines ────────────────────────────────────────────
class StreamProgress:
    _STEPS = 6
    def __init__(self):
        self._lines = []
        self._step = 0; self._item_done = 0; self._item_total = 1
        self._url_i = 0; self._url_n = 0
        self._stats = {"success":0,"failed":0,"skipped":0}
        self._overall_pct = 0; self._overall_lbl = ""
        self._step_pct = 0;    self._step_lbl = ""
        self._item_pct = 0;    self._item_lbl = ""

    def _push(self, line): self._lines.append(line)
    def pop_lines(self):
        lines = self._lines[:]
        self._lines.clear()
        return lines

    def show_banner(self):         self._push("══ Douyin Downloader v2.0.0 ══")
    def print_info(self,m):        self._push(f"ℹ  {m}")
    def print_success(self,m):     self._push(f"✓  {m}")
    def print_warning(self,m):     self._push(f"⚠  {m}")
    def print_error(self,m):       self._push(f"✗  {m}")

    def start_download_session(self,n):
        self._url_n=n; self._overall_pct=0; self._overall_lbl=f"0/{n} URL"
    def stop_download_session(self):
        self._overall_pct=100; self._overall_lbl="完成"

    def start_url(self,i,n,url):
        self._url_i=i; self._url_n=n; self._step=0
        self._item_done=0; self._item_total=1
        self._stats={"success":0,"failed":0,"skipped":0}
        self._step_pct=0; self._step_lbl=f"[{i}/{n}] 待开始"
        self._push(f"\n▶ [{i}/{n}] {url}")

    def complete_url(self,result=None):
        self._step_pct=100; self._step_lbl=f"[{self._url_i}/{self._url_n}] 完成"
        self._overall_pct=int(self._url_i/max(self._url_n,1)*100)
        self._overall_lbl=f"{self._url_i}/{self._url_n} URL"
        if result:
            self._push(f"✓ 成功:{result.success} 失败:{result.failed} 跳过:{result.skipped}")

    def fail_url(self,reason):
        self._step_pct=100; self._step_lbl=f"[{self._url_i}/{self._url_n}] 失败"
        self._push(f"✗ {reason}")

    def advance_step(self,step,detail=""):
        self._step=min(self._step+1,self._STEPS)
        self._step_pct=int(self._step/self._STEPS*100)
        self._step_lbl=f"[{self._url_i}/{self._url_n}] {step}"
        if detail: self._push(f"   → {step}: {detail}")

    def update_step(self,step,detail=""):
        self._step_pct=int(self._step/self._STEPS*100)
        self._step_lbl=f"[{self._url_i}/{self._url_n}] {step}"
        if detail: self._push(f"   → {step}: {detail}")

    def set_item_total(self,total,detail=""):
        self._item_total=max(total,1); self._item_done=0
        self._stats={"success":0,"failed":0,"skipped":0}
        self._item_pct=0; self._item_lbl=f"作品 0/{total}"
        if detail: self._push(f"   {detail}")

    def advance_item(self,status,detail=""):
        if status in self._stats: self._stats[status]+=1
        self._item_done=min(self._item_done+1,self._item_total)
        self._item_pct=int(self._item_done/self._item_total*100)
        s=self._stats
        self._item_lbl=f"作品 {self._item_done}/{self._item_total}  ✓{s['success']} ✗{s['failed']} -{s['skipped']}"

    def show_result(self,result):
        self._push(f"\n{'─'*44}")
        self._push(f"  总计:{result.total}  成功:{result.success}  失败:{result.failed}  跳过:{result.skipped}")
        self._push(f"{'─'*44}")

# ── Tab: Config ───────────────────────────────────────────────────────────────
def build_config_tab():
    cfg = load_cfg()
    nums = cfg.get("number", {})
    modes = cfg.get("mode", [])

    with gr.Tab("⚙ Config"):
        gr.Markdown("### Download URLs")
        urls_box = gr.Textbox(
            value="\n".join(cfg.get("link", [])),
            lines=4, placeholder="One URL per line",
            label="URLs")

        with gr.Row():
            save_path = gr.Textbox(value=cfg.get("path","./Downloaded/"), label="Save Path")

        gr.Markdown("### Download Mode")
        with gr.Row():
            mode_post  = gr.Checkbox(value="post"       in modes, label="post")
            mode_like  = gr.Checkbox(value="like"       in modes, label="like")
            mode_col   = gr.Checkbox(value="collect"    in modes, label="collect")
            mode_music = gr.Checkbox(value="music"      in modes, label="music")
            mode_mix   = gr.Checkbox(value="mix"        in modes, label="mix")
            mode_cmix  = gr.Checkbox(value="collectmix" in modes, label="collectmix")

        gr.Markdown("### Max Items per Mode (0 = unlimited)")
        with gr.Row():
            n_post  = gr.Number(value=nums.get("post",0),       label="post",       precision=0)
            n_like  = gr.Number(value=nums.get("like",0),       label="like",       precision=0)
            n_col   = gr.Number(value=nums.get("collect",0),    label="collect",    precision=0)
            n_music = gr.Number(value=nums.get("music",0),      label="music",      precision=0)
            n_mix   = gr.Number(value=nums.get("mix",0),        label="mix",        precision=0)
            n_cmix  = gr.Number(value=nums.get("collectmix",0), label="collectmix", precision=0)

        gr.Markdown("### Options")
        with gr.Row():
            opt_music  = gr.Checkbox(value=cfg.get("music",True),      label="Download Music")
            opt_cover  = gr.Checkbox(value=cfg.get("cover",True),      label="Download Cover")
            opt_json   = gr.Checkbox(value=cfg.get("json",True),       label="Save JSON")
            opt_folder = gr.Checkbox(value=cfg.get("folderstyle",True),label="Folder per user")

        gr.Markdown("### Advanced")
        with gr.Row():
            threads = gr.Number(value=cfg.get("thread",5),       label="Threads",  precision=0)
            retries = gr.Number(value=cfg.get("retry_times",3),  label="Retries",  precision=0)
            proxy   = gr.Textbox(value=cfg.get("proxy",""),      label="Proxy")
        with gr.Row():
            start_date = gr.Textbox(value=cfg.get("start_time",""), label="Start Date (YYYY-MM-DD)")
            end_date   = gr.Textbox(value=cfg.get("end_time",""),   label="End Date (YYYY-MM-DD)")

        save_btn = gr.Button("💾 Save Config", variant="primary")
        save_msg = gr.Textbox(label="", interactive=False, max_lines=1)

        def do_save(urls, path, mp, ml, mc, mm, mmix, mcmix,
                    np, nl, nc, nm, nmix, ncmix,
                    omusic, ocover, ojson, ofolder,
                    thr, ret, prx, sd, ed):
            cfg = load_cfg()
            cfg.update({
                "link":  [u.strip() for u in urls.splitlines() if u.strip()],
                "path":  path,
                "mode":  [m for m,v in [("post",mp),("like",ml),("collect",mc),
                                         ("music",mm),("mix",mmix),("collectmix",mcmix)] if v],
                "number": {"post":int(np),"like":int(nl),"collect":int(nc),
                           "music":int(nm),"mix":int(nmix),"collectmix":int(ncmix)},
                "music": omusic, "cover": ocover, "json": ojson, "folderstyle": ofolder,
                "thread": int(thr), "retry_times": int(ret),
                "proxy": prx, "start_time": sd, "end_time": ed,
            })
            save_cfg(cfg)
            return "✓ Config saved"

        save_btn.click(do_save,
            inputs=[urls_box, save_path,
                    mode_post, mode_like, mode_col, mode_music, mode_mix, mode_cmix,
                    n_post, n_like, n_col, n_music, n_mix, n_cmix,
                    opt_music, opt_cover, opt_json, opt_folder,
                    threads, retries, proxy, start_date, end_date],
            outputs=save_msg)

# ── Tab: Cookies ──────────────────────────────────────────────────────────────
def build_cookies_tab():
    cfg = load_cfg()
    cookies = cfg.get("cookies", {}) or {}

    with gr.Tab("🍪 Cookies"):
        gr.Markdown("### Paste Cookie String")
        raw_box = gr.Textbox(lines=3, placeholder="Paste full cookie string here…", label="Raw Cookie")
        parse_btn = gr.Button("⬆ Parse → fields")

        gr.Markdown("### Cookie Fields")
        fields = ["ttwid","odin_tt","passport_csrf_token","msToken",
                  "sid_guard","s_v_web_id","__ac_nonce","__ac_signature"]
        field_inputs = {}
        with gr.Row():
            for k in fields[:4]:
                field_inputs[k] = gr.Textbox(value=cookies.get(k,""), label=k)
        with gr.Row():
            for k in fields[4:]:
                field_inputs[k] = gr.Textbox(value=cookies.get(k,""), label=k)

        status_box = gr.Textbox(label="Status", interactive=False, max_lines=1)

        with gr.Row():
            validate_btn = gr.Button("✅ Validate")
            save_ck_btn  = gr.Button("💾 Save Cookies", variant="primary")
            fetch_btn    = gr.Button("🌐 Auto-fetch (browser)")

        def do_parse(raw):
            from utils.cookie_utils import parse_cookie_header
            parsed = parse_cookie_header(raw)
            return [parsed.get(k,"") for k in fields] + [f"✓ Parsed {len(parsed)} cookies"]

        parse_btn.click(do_parse, inputs=[raw_box],
                        outputs=list(field_inputs.values()) + [status_box])

        def do_validate(*vals):
            from auth import CookieManager
            cm = CookieManager()
            cm.set_cookies(dict(zip(fields, vals)))
            ok = cm.validate_cookies()
            return "🟢 Cookies look valid" if ok else "🔴 Missing: ttwid / odin_tt / passport_csrf_token"

        validate_btn.click(do_validate, inputs=list(field_inputs.values()), outputs=status_box)

        def do_save_cookies(*vals):
            cfg = load_cfg()
            cfg["cookies"] = {k:v for k,v in zip(fields,vals) if v}
            save_cfg(cfg)
            return "✓ Cookies saved"

        save_ck_btn.click(do_save_cookies, inputs=list(field_inputs.values()), outputs=status_box)

        def do_fetch():
            import argparse
            from tools.cookie_fetcher import capture_cookies
            args = argparse.Namespace(
                url="https://www.douyin.com/", browser="chromium",
                headless=False, output=ROOT/"config"/"cookies.json",
                config=CONFIG_FILE, include_all=False)
            asyncio.run(capture_cookies(args))
            cfg = load_cfg()
            ck = cfg.get("cookies",{}) or {}
            return [ck.get(k,"") for k in fields] + ["✓ Cookies fetched & saved"]

        fetch_btn.click(do_fetch, outputs=list(field_inputs.values()) + [status_box])

# ── Tab: Download ─────────────────────────────────────────────────────────────
def build_download_tab():
    with gr.Tab("⬇ Download"):
        gr.Markdown("Config is loaded from `config.yml`. Save it first before downloading.")

        with gr.Row():
            extra_url = gr.Textbox(label="Extra URL (optional, overrides config)", placeholder="https://www.douyin.com/user/…")

        start_btn = gr.Button("▶ Start Download", variant="primary")

        with gr.Row():
            pb_overall = gr.Slider(0, 100, value=0, label="Overall",    interactive=False)
            pb_step    = gr.Slider(0, 100, value=0, label="Step",       interactive=False)
            pb_item    = gr.Slider(0, 100, value=0, label="Items",      interactive=False)

        log_out = gr.Textbox(label="Log", lines=20, max_lines=20,
                             interactive=False, autoscroll=True)

        def run_download(extra):
            import logging
            from config import ConfigLoader
            from auth import CookieManager
            from storage import Database, FileManager
            from control import QueueManager, RateLimiter, RetryHandler
            from core import DouyinAPIClient, URLParser, DownloaderFactory
            from core.downloader_base import DownloadResult
            from utils.logger import set_console_log_level
            import json as _j

            set_console_log_level(logging.CRITICAL)
            prog = StreamProgress()
            log_acc = []

            def flush():
                lines = prog.pop_lines()
                if lines:
                    log_acc.extend(lines)
                return ("\n".join(log_acc),
                        prog._overall_pct, prog._step_pct, prog._item_pct)

            async def _run():
                config = ConfigLoader(str(CONFIG_FILE))
                if extra.strip():
                    config.update(link=[extra.strip()])
                if not config.validate():
                    prog.print_error("Invalid config"); return

                cm = CookieManager(); cm.set_cookies(config.get_cookies())
                if not cm.validate_cookies():
                    prog.print_warning("Cookies may be invalid")

                db = None
                if config.get("database"):
                    db = Database(db_path=str(config.get("database_path","dy_downloader.db")))
                    await db.initialize()
                    prog.print_success("Database initialized")

                urls = config.get_links()
                prog.print_info(f"Found {len(urls)} URL(s)")
                prog.start_download_session(len(urls))
                results = []

                try:
                    for i, url in enumerate(urls, 1):
                        prog.start_url(i, len(urls), url)
                        orig = url
                        try:
                            fm = FileManager(config.get("path"))
                            rl = RateLimiter(max_per_second=float(config.get("rate_limit",2) or 2))
                            rh = RetryHandler(max_retries=config.get("retry_times",3))
                            qm = QueueManager(max_workers=int(config.get("thread",5) or 5))
                            async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
                                prog.advance_step("解析链接","")
                                if url.startswith("https://v.douyin.com"):
                                    r = await api.resolve_short_url(url)
                                    if r: url = r
                                parsed = URLParser.parse(url)
                                if not parsed:
                                    prog.fail_url("URL parse failed"); continue
                                prog.advance_step("创建下载器", parsed["type"])
                                dl = DownloaderFactory.create(
                                    parsed["type"],config,api,fm,cm,db,rl,rh,qm,
                                    progress_reporter=prog)
                                if not dl:
                                    prog.fail_url("No downloader"); continue
                                prog.advance_step("执行下载","")
                                result = await dl.download(parsed)
                                prog.advance_step("记录历史","")
                                if result and db:
                                    safe = {k:v for k,v in config.config.items()
                                            if k not in ("cookies","cookie","transcript")}
                                    await db.add_history({
                                        "url":orig,"url_type":parsed["type"],
                                        "total_count":result.total,"success_count":result.success,
                                        "config":_j.dumps(safe,ensure_ascii=False)})
                                prog.advance_step("收尾","")
                                if result:
                                    results.append(result); prog.complete_url(result)
                                else:
                                    prog.fail_url("No result")
                        except Exception as e:
                            prog.fail_url(str(e))
                finally:
                    prog.stop_download_session()
                    if db: await db.close()

                if results:
                    tot = DownloadResult()
                    for r in results:
                        tot.total+=r.total; tot.success+=r.success
                        tot.failed+=r.failed; tot.skipped+=r.skipped
                    prog.show_result(tot)

            # run in thread, yield updates
            done = threading.Event()
            def _thread():
                asyncio.run(_run())
                done.set()

            threading.Thread(target=_thread, daemon=True).start()
            import time
            while not done.is_set():
                time.sleep(0.4)
                yield flush()
            yield flush()

        start_btn.click(run_download, inputs=[extra_url],
                        outputs=[log_out, pb_overall, pb_step, pb_item])

# ── Tab: Transcribe ───────────────────────────────────────────────────────────
def build_transcribe_tab():
    with gr.Tab("🎙 Transcribe"):
        gr.Markdown("### Whisper Local Transcription")
        with gr.Row():
            tr_dir  = gr.Textbox(value="./Downloaded", label="Video Folder")
            tr_file = gr.Textbox(label="Single File (optional)")
        with gr.Row():
            tr_model = gr.Dropdown(["tiny","base","small","medium","large"],
                                   value="base", label="Model")
            tr_lang  = gr.Textbox(value="zh", label="Language")
            tr_out   = gr.Textbox(value="./transcripts", label="Output Dir")
        with gr.Row():
            tr_srt  = gr.Checkbox(value=False, label="Output SRT")
            tr_skip = gr.Checkbox(value=True,  label="Skip existing")
            tr_sc   = gr.Checkbox(value=False, label="Traditional→Simplified (OpenCC)")

        tr_btn = gr.Button("▶ Start Transcribe", variant="primary")
        with gr.Row():
            pb_tr_overall = gr.Slider(0,100,value=0,label="Overall",  interactive=False)
            pb_tr_file    = gr.Slider(0,100,value=0,label="File",     interactive=False)
        tr_log = gr.Textbox(label="Log", lines=16, interactive=False, autoscroll=True)

        def run_transcribe(folder, single, model_name, lang, out_dir, srt, skip, sc):
            from cli.whisper_transcribe import find_ffmpeg, find_videos, transcribe_file
            log_acc = []
            def L(t): log_acc.append(t)

            ffmpeg = find_ffmpeg()
            if not ffmpeg:
                yield "\n".join(log_acc+["✗ ffmpeg not found"]), 0, 0; return
            try:
                import whisper
            except ImportError:
                yield "\n".join(log_acc+["✗ openai-whisper not installed: pip install openai-whisper"]), 0, 0; return

            converter = None
            if sc:
                try:
                    from opencc import OpenCC; converter = OpenCC("t2s")
                except ImportError:
                    L("⚠ OpenCC not installed, skipping")

            L(f"ℹ Loading model: {model_name}…")
            yield "\n".join(log_acc), 0, 0
            model = whisper.load_model(model_name)
            L(f"✓ Model {model_name} loaded")

            videos = [Path(single)] if single.strip() else find_videos(
                folder, skip_existing=skip, output_dir=out_dir or None)
            if not videos:
                L("⚠ No videos found"); yield "\n".join(log_acc), 0, 0; return

            L(f"ℹ Found {len(videos)} video(s)")
            fmts = {"txt"}
            if srt: fmts.add("srt")
            ok_c = fail_c = 0

            import time
            for i, v in enumerate(videos, 1):
                L(f"\n▶ [{i}/{len(videos)}] {v.name}")
                yield "\n".join(log_acc), int((i-1)/len(videos)*100), 0
                try:
                    ok = transcribe_file(v, model, ffmpeg, fmts, lang, converter, out_dir or None)
                    if ok: ok_c+=1; L("✓ Done")
                    else:  fail_c+=1; L("✗ Failed")
                except Exception as e:
                    fail_c+=1; L(f"✗ {e}")
                pct = int(i/len(videos)*100)
                yield "\n".join(log_acc), pct, 100

            L(f"\n{'─'*40}\n成功:{ok_c}  失败:{fail_c}\n{'─'*40}")
            yield "\n".join(log_acc), 100, 100

        tr_btn.click(run_transcribe,
            inputs=[tr_dir,tr_file,tr_model,tr_lang,tr_out,tr_srt,tr_skip,tr_sc],
            outputs=[tr_log, pb_tr_overall, pb_tr_file])

# ── Tab: History ──────────────────────────────────────────────────────────────
def build_history_tab():
    with gr.Tab("🗄 History"):
        db_path_box = gr.Textbox(value=load_cfg().get("database_path","dy_downloader.db"),
                                 label="Database Path")
        with gr.Row():
            refresh_btn = gr.Button("🔄 Refresh")
            clear_btn   = gr.Button("🗑 Clear All", variant="stop")

        history_table = gr.Dataframe(
            headers=["Time","URL","Type","Total","Success"],
            datatype=["str","str","str","number","number"],
            interactive=False, wrap=True)

        def do_refresh(db_path):
            from datetime import datetime
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
                    data.append([ts, (r[1] or "")[:70], r[2], r[3], r[4]])
                return data
            except Exception as e:
                return [[str(e),"","","",""]]

        def do_clear(db_path):
            async def clear():
                from storage import Database
                db = Database(db_path=db_path)
                await db.initialize()
                conn = await db._get_conn()
                await conn.execute("DELETE FROM download_history")
                await conn.commit()
                await db.close()
            asyncio.run(clear())
            return []

        refresh_btn.click(do_refresh, inputs=[db_path_box], outputs=[history_table])
        clear_btn.click(do_clear,     inputs=[db_path_box], outputs=[history_table])

# ── Main ──────────────────────────────────────────────────────────────────────
def build_app():
    with gr.Blocks(title="Douyin Downloader", theme=gr.themes.Soft()) as app:
        gr.Markdown("# 🎵 Douyin Downloader")
        build_config_tab()
        build_cookies_tab()
        build_download_tab()
        build_transcribe_tab()
        build_history_tab()
    return app

if __name__ == "__main__":
    app = build_app()
    app.launch(server_port=7860, inbrowser=True)
