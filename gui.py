#!/usr/bin/env python3
"""Douyin Downloader — Full GUI"""
import asyncio, sys, threading, tkinter as tk, json
from pathlib import Path
from tkinter import filedialog, scrolledtext, ttk, messagebox
import yaml

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
CONFIG_FILE = ROOT / "config.yml"

# ── palette ───────────────────────────────────────────────────────────────────
BG      = "#1e1e2e"
SURF    = "#2a2a3e"
SURF2   = "#313145"
ACCENT  = "#7c6af7"
GREEN   = "#50fa7b"
RED     = "#ff5555"
YELLOW  = "#f1fa8c"
CYAN    = "#8be9fd"
FG      = "#cdd6f4"
DIM     = "#6c7086"

# ── yaml helpers ──────────────────────────────────────────────────────────────
def load_cfg():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE,"r",encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}

def save_cfg(cfg):
    with open(CONFIG_FILE,"w",encoding="utf-8") as f:
        yaml.dump(cfg, f, allow_unicode=True, default_flow_style=False)

# ── GUIProgress shim ──────────────────────────────────────────────────────────
class GUIProgress:
    _STEPS = 6
    def __init__(self, log, set_step, set_item, set_overall):
        self._log=log; self._set_step=set_step
        self._set_item=set_item; self._set_overall=set_overall
        self._step=0; self._item_done=0; self._item_total=1
        self._url_i=0; self._url_n=0
        self._stats={"success":0,"failed":0,"skipped":0}

    def show_banner(self):         self._log("══ Douyin Downloader v2.0.0 ══\n","banner")
    def print_info(self,m):        self._log(f"ℹ  {m}\n","info")
    def print_success(self,m):     self._log(f"✓  {m}\n","success")
    def print_warning(self,m):     self._log(f"⚠  {m}\n","warning")
    def print_error(self,m):       self._log(f"✗  {m}\n","error")

    def start_download_session(self,n):
        self._url_n=n; self._set_overall(0,f"0/{n} URL")
    def stop_download_session(self):
        self._set_overall(100,"完成")

    def start_url(self,i,n,url):
        self._url_i=i; self._url_n=n; self._step=0
        self._item_done=0; self._item_total=1
        self._stats={"success":0,"failed":0,"skipped":0}
        self._set_step(0,f"[{i}/{n}] 待开始")
        self._log(f"\n▶ [{i}/{n}] {url}\n","url")

    def complete_url(self,result=None):
        self._set_step(100,f"[{self._url_i}/{self._url_n}] 完成")
        pct=int(self._url_i/max(self._url_n,1)*100)
        self._set_overall(pct,f"{self._url_i}/{self._url_n} URL")
        if result:
            self._log(f"✓ 成功:{result.success} 失败:{result.failed} 跳过:{result.skipped}\n","success")

    def fail_url(self,reason):
        self._set_step(100,f"[{self._url_i}/{self._url_n}] 失败")
        self._log(f"✗ {reason}\n","error")

    def advance_step(self,step,detail=""):
        self._step=min(self._step+1,self._STEPS)
        pct=int(self._step/self._STEPS*100)
        self._set_step(pct,f"[{self._url_i}/{self._url_n}] {step}")
        if detail: self._log(f"   → {step}: {detail}\n","detail")

    def update_step(self,step,detail=""):
        pct=int(self._step/self._STEPS*100)
        self._set_step(pct,f"[{self._url_i}/{self._url_n}] {step}")
        if detail: self._log(f"   → {step}: {detail}\n","detail")

    def set_item_total(self,total,detail=""):
        self._item_total=max(total,1); self._item_done=0
        self._stats={"success":0,"failed":0,"skipped":0}
        self._set_item(0,f"作品 0/{total}")
        if detail: self._log(f"   {detail}\n","detail")

    def advance_item(self,status,detail=""):
        if status in self._stats: self._stats[status]+=1
        self._item_done=min(self._item_done+1,self._item_total)
        pct=int(self._item_done/self._item_total*100)
        s=self._stats
        self._set_item(pct,f"作品 {self._item_done}/{self._item_total}  ✓{s['success']} ✗{s['failed']} -{s['skipped']}")

    def show_result(self,result):
        self._log(
            f"\n{'─'*44}\n"
            f"  总计:{result.total}  成功:{result.success}  失败:{result.failed}  跳过:{result.skipped}\n"
            f"{'─'*44}\n","result")

# ── Widget factory ────────────────────────────────────────────────────────────
def lbl(parent, text, fg=DIM, font=("Segoe UI",9)):
    return tk.Label(parent, text=text, bg=BG, fg=fg, font=font)

def btn(parent, text, cmd, bg=SURF, fg=FG, padx=12, pady=5):
    return tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg,
                     activebackground=ACCENT, activeforeground="white",
                     relief="flat", padx=padx, pady=pady,
                     font=("Segoe UI",10), cursor="hand2")

def entry(parent, textvariable, width=30, **kw):
    return tk.Entry(parent, textvariable=textvariable, width=width,
                    bg=SURF, fg=FG, insertbackground=FG, relief="flat",
                    font=("Consolas",10), **kw)

def section(parent, title):
    f = tk.LabelFrame(parent, text=f"  {title}  ", bg=BG, fg=ACCENT,
                      font=("Segoe UI", 10, "bold"), relief="flat",
                      highlightbackground=SURF2, highlightthickness=1)
    return f

def logbox(parent, height=14):
    box = scrolledtext.ScrolledText(parent, height=height, bg="#11111b", fg=FG,
                                    font=("Consolas",9), relief="flat", bd=0,
                                    state="disabled")
    for tag,col in [("banner",ACCENT),("success",GREEN),("error",RED),
                    ("warning",YELLOW),("url",CYAN),("detail",DIM),
                    ("result",GREEN),("info",FG)]:
        box.tag_config(tag, foreground=col)
    return box

def log_write(box, text, tag="info"):
    box.config(state="normal")
    box.insert("end", text, tag)
    box.see("end")
    box.config(state="disabled")

def progress_row(parent, label, row):
    """Returns (progressbar, label_var)"""
    tk.Label(parent, text=label, bg=SURF, fg=DIM,
             font=("Segoe UI",9), width=8, anchor="w").grid(
                 row=row*2, column=0, sticky="w", padx=10, pady=(6,1))
    lv = tk.StringVar(value="—")
    tk.Label(parent, textvariable=lv, bg=SURF, fg=FG,
             font=("Segoe UI",9)).grid(row=row*2, column=1, sticky="w")
    pb = ttk.Progressbar(parent, length=640, mode="determinate")
    pb.grid(row=row*2+1, column=0, columnspan=3, padx=10, pady=(0,4), sticky="ew")
    return pb, lv

# ── App ───────────────────────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Douyin Downloader")
        self.geometry("960x700")
        self.configure(bg=BG)
        self._dl_running = False
        self._tr_running = False
        self._apply_styles()
        self._build()
        self._load_all()

    def _apply_styles(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("TNotebook",       background=BG, borderwidth=0)
        s.configure("TNotebook.Tab",   background=SURF, foreground=FG,
                    padding=[16,7],    font=("Segoe UI",10))
        s.map("TNotebook.Tab",
              background=[("selected",ACCENT)],
              foreground=[("selected","white")])
        s.configure("TProgressbar", troughcolor=SURF2, background=ACCENT, thickness=13)
        s.configure("TCombobox",    fieldbackground=SURF, background=SURF,
                    foreground=FG,  selectbackground=ACCENT)

    def _build(self):
        # header
        h = tk.Frame(self, bg=ACCENT, height=46)
        h.pack(fill="x")
        tk.Label(h, text="  🎵  Douyin Downloader", bg=ACCENT, fg="white",
                 font=("Segoe UI",14,"bold")).pack(side="left", pady=8)

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, padx=8, pady=6)

        tabs = {}
        for name in ["⚙ Config","🍪 Cookies","⬇ Download","🎬 Video Process","🗄 History","🎵 TikTok"]:
            f = tk.Frame(nb, bg=BG)
            nb.add(f, text=name)
            tabs[name] = f

        self._build_config(tabs["⚙ Config"])
        self._build_cookies(tabs["🍪 Cookies"])
        self._build_download(tabs["⬇ Download"])
        self._build_vprocess(tabs["🎬 Video Process"])
        self._build_history(tabs["🗄 History"])
        self._build_tiktok(tabs["🎵 TikTok"])

    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 1 — Config
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_config(self, p):
        # Using a Canvas with Scrollbar for the config tab
        canvas = tk.Canvas(p, bg=BG, highlightthickness=0)
        sb = ttk.Scrollbar(p, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        canvas.pack(fill="both", expand=True)

        inner = tk.Frame(canvas, bg=BG)
        win = canvas.create_window((0, 0), window=inner, anchor="nw")

        def _on_frame_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))

        inner.bind("<Configure>", _on_frame_configure)
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(win, width=e.width))

        # Add mousewheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
        
        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        # Padding settings
        sec_pad = dict(padx=20, pady=10)
        inner_pad = dict(padx=15, pady=10)

        # 1. Download Content
        sec_content = section(inner, "Nội dung tải về (Download Content)")
        sec_content.pack(fill="x", **sec_pad)
        
        f_url = tk.Frame(sec_content, bg=BG)
        f_url.pack(fill="x", **inner_pad)
        lbl(f_url, "Danh sách URL (mỗi dòng một link):", fg=FG, font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(0, 5))
        self.txt_urls = scrolledtext.ScrolledText(f_url, height=5, bg=SURF, fg=FG,
            insertbackground=FG, font=("Consolas", 10), relief="flat", bd=0)
        self.txt_urls.pack(fill="x")

        # 2. Save Settings
        sec_save = section(inner, "Cấu hình lưu trữ (Storage Settings)")
        sec_save.pack(fill="x", **sec_pad)
        
        f_path = tk.Frame(sec_save, bg=BG)
        f_path.pack(fill="x", **inner_pad)
        lbl(f_path, "Thư mục lưu:", fg=FG).grid(row=0, column=0, sticky="w", pady=5)
        self.var_path = tk.StringVar()
        e_path = entry(f_path, self.var_path, width=50)
        e_path.grid(row=0, column=1, sticky="ew", padx=10)
        btn(f_path, "📁 Chọn thư mục", self._browse_path).grid(row=0, column=2, sticky="e")
        f_path.columnconfigure(1, weight=1)

        f_opts = tk.Frame(sec_save, bg=BG)
        f_opts.pack(fill="x", padx=15, pady=(0, 10))
        self.var_music  = tk.BooleanVar(value=True)
        self.var_cover  = tk.BooleanVar(value=True)
        self.var_json   = tk.BooleanVar(value=True)
        self.var_folder = tk.BooleanVar(value=True)
        
        opt_list = [
            ("Tải nhạc nền", "var_music"),
            ("Tải ảnh bìa", "var_cover"),
            ("Lưu file JSON", "var_json"),
            ("Tạo thư mục riêng mỗi user", "var_folder")
        ]
        for i, (text, var_name) in enumerate(opt_list):
            r, c = divmod(i, 2)
            tk.Checkbutton(f_opts, text=text, variable=getattr(self, var_name),
                bg=BG, fg=FG, selectcolor=SURF, activebackground=BG,
                activeforeground=ACCENT, font=("Segoe UI", 10)).grid(row=r, column=c, sticky="w", padx=10, pady=2)

        # 3. Download Modes & Limits
        sec_mode = section(inner, "Chế độ & Giới hạn (Modes & Limits)")
        sec_mode.pack(fill="x", **sec_pad)
        
        f_mode = tk.Frame(sec_mode, bg=BG)
        f_mode.pack(fill="x", **inner_pad)
        
        lbl(f_mode, "Bật chế độ", fg=ACCENT, font=("Segoe UI", 9, "bold")).grid(row=0, column=1, columnspan=2, pady=(0, 5))
        lbl(f_mode, "Số lượng (0=vô hạn)", fg=ACCENT, font=("Segoe UI", 9, "bold")).grid(row=0, column=3, pady=(0, 5))

        self.mode_vars = {}
        self.num_vars = {}
        modes = [
            ("post", "Bài viết"),
            ("like", "Yêu thích"),
            ("collect", "Bộ sưu tập"),
            ("music", "Nhạc"),
            ("mix", "Mix"),
            ("collectmix", "Collect Mix")
        ]
        
        for i, (m, label) in enumerate(modes):
            # Checkbox
            v_mode = tk.BooleanVar()
            self.mode_vars[m] = v_mode
            tk.Checkbutton(f_mode, text=label, variable=v_mode, bg=BG, fg=FG,
                selectcolor=SURF, activebackground=BG, activeforeground=ACCENT,
                font=("Segoe UI", 10), width=12, anchor="w").grid(row=i+1, column=1, sticky="w", padx=(10, 20), pady=2)
            
            # Entry
            v_num = tk.StringVar(value="0")
            self.num_vars[m] = v_num
            tk.Entry(f_mode, textvariable=v_num, width=8, bg=SURF, fg=FG,
                insertbackground=FG, relief="flat", font=("Consolas", 10),
                justify="center").grid(row=i+1, column=3, padx=10, pady=2)
        
        f_mode.columnconfigure(0, weight=1)
        f_mode.columnconfigure(4, weight=1)

        # 4. Advanced & Filters
        sec_adv = section(inner, "Nâng cao & Lọc (Advanced & Filters)")
        sec_adv.pack(fill="x", **sec_pad)
        
        f_adv = tk.Frame(sec_adv, bg=BG)
        f_adv.pack(fill="x", **inner_pad)
        
        self.var_thread = tk.StringVar(value="5")
        self.var_retry  = tk.StringVar(value="3")
        self.var_proxy  = tk.StringVar()
        self.var_start  = tk.StringVar()
        self.var_end    = tk.StringVar()

        adv_fields = [
            ("Số luồng (Threads):", "var_thread", 10),
            ("Số lần thử lại (Retries):", "var_retry", 10),
            ("Proxy (IP:PORT):", "var_proxy", 30),
            ("Từ ngày (YYYY-MM-DD):", "var_start", 15),
            ("Đến ngày (YYYY-MM-DD):", "var_end", 15)
        ]

        for i, (label, var_name, w) in enumerate(adv_fields):
            lbl(f_adv, label, fg=DIM).grid(row=i, column=0, sticky="w", pady=5)
            entry(f_adv, getattr(self, var_name), width=w).grid(row=i, column=1, sticky="w", padx=10, pady=5)

        # 5. Automation
        sec_auto = section(inner, "Tự động hóa (Automation)")
        sec_auto.pack(fill="x", **sec_pad)
        
        f_auto = tk.Frame(sec_auto, bg=BG)
        f_auto.pack(fill="x", **inner_pad)
        
        self.var_auto_upload = tk.BooleanVar(value=False)
        tk.Checkbutton(f_auto, text="Tự động đăng sau khi tải", variable=self.var_auto_upload,
            bg=BG, fg=FG, selectcolor=SURF, activebackground=BG,
            activeforeground=ACCENT, font=("Segoe UI", 10)).grid(row=0, column=0, sticky="w", pady=5)
        
        lbl(f_auto, "Nền tảng:", fg=DIM).grid(row=0, column=1, sticky="w", padx=(20, 5))
        self.var_upload_platform = tk.StringVar(value="tiktok")
        cb_platform = ttk.Combobox(f_auto, textvariable=self.var_upload_platform, width=12,
            values=["tiktok","youtube"], state="readonly")
        cb_platform.grid(row=0, column=2, sticky="w")

        # Save Button
        btn_save = btn(inner, "  💾  Lưu cấu hình (Save Config)  ", self._save_config, bg=GREEN, fg=BG)
        btn_save.config(font=("Segoe UI", 11, "bold"))
        btn_save.pack(pady=20, padx=20, anchor="center")

    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 2 — Cookies
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_cookies(self, p):
        pad = dict(padx=14, pady=5)

        sec1 = section(p,"Paste Cookie String"); sec1.pack(fill="x", **pad)
        self.txt_cookie_raw = scrolledtext.ScrolledText(sec1, height=4, bg=SURF, fg=FG,
            insertbackground=FG, font=("Consolas",9), relief="flat", bd=0)
        self.txt_cookie_raw.pack(fill="x", padx=8, pady=(4,4))
        btn(sec1,"⬆  Parse → fields", self._parse_cookie_str).pack(
            anchor="w", padx=8, pady=(0,8))

        sec2 = section(p,"Cookie Fields"); sec2.pack(fill="x", **pad)
        self.cookie_fields = {}
        fields = ["ttwid","odin_tt","passport_csrf_token","msToken",
                  "sid_guard","s_v_web_id","__ac_nonce","__ac_signature",
                  "sessionid","sid_tt"]
        grid = tk.Frame(sec2, bg=BG); grid.pack(fill="x", padx=8, pady=6)
        for i,key in enumerate(fields):
            r,c = divmod(i,2)
            tk.Label(grid, text=key, bg=BG, fg=DIM, font=("Segoe UI",9),
                width=24, anchor="w").grid(row=r, column=c*2, sticky="w", padx=4, pady=3)
            v = tk.StringVar()
            self.cookie_fields[key] = v
            tk.Entry(grid, textvariable=v, width=36, bg=SURF, fg=FG,
                insertbackground=FG, relief="flat",
                font=("Consolas",9)).grid(row=r, column=c*2+1, padx=4, pady=3)

        # status indicator
        self.var_cookie_status = tk.StringVar(value="⚪ Not validated")
        tk.Label(p, textvariable=self.var_cookie_status, bg=BG, fg=DIM,
                 font=("Segoe UI",9)).pack(anchor="w", padx=14)

        brow = tk.Frame(p, bg=BG); brow.pack(anchor="e", padx=14, pady=10)
        btn(brow,"🌐  Auto-fetch (browser)", self._auto_fetch_cookies).pack(side="left",padx=6)
        btn(brow,"✅  Validate", self._validate_cookies).pack(side="left",padx=6)
        btn(brow,"💾  Save Cookies", self._save_cookies, bg=GREEN, fg=BG).pack(side="left")

    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 3 — Download
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_download(self, p):
        # progress panel
        pf = tk.Frame(p, bg=SURF); pf.pack(fill="x", padx=14, pady=(10,4))
        self.pb_overall, self.lv_overall = progress_row(pf,"Overall",0)
        self.pb_step,    self.lv_step    = progress_row(pf,"Step",   1)
        self.pb_item,    self.lv_item    = progress_row(pf,"Items",  2)
        pf.columnconfigure(2, weight=1)

        self.dl_log = logbox(p, height=16)
        self.dl_log.pack(fill="both", expand=True, padx=14, pady=(4,4))

        brow = tk.Frame(p, bg=BG); brow.pack(fill="x", padx=14, pady=6)
        self.btn_dl = btn(brow,"▶  Start Download", self._start_download, bg=ACCENT, fg="white")
        self.btn_dl.pack(side="left", padx=4)
        btn(brow,"🗑  Clear Log", lambda: self._clear_log(self.dl_log)).pack(side="left",padx=4)

    # ═══════════════════════════════════════════════════════════════════════════
    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 4 — Video Process (Sub-tabbed)
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_vprocess(self, p):
        # Create a container with a sidebar and a content area
        p_container = tk.Frame(p, bg=BG)
        p_container.pack(fill="both", expand=True)

        # Sidebar
        p_sidebar = tk.Frame(p_container, bg=BG2, width=160, highlightbackground=SURF, highlightthickness=1)
        p_sidebar.pack(side="left", fill="y")
        p_sidebar.pack_propagate(False)

        # Content area
        p_main = tk.Frame(p_container, bg=BG)
        p_main.pack(side="left", fill="both", expand=True)

        frames = {}
        
        # Sub-page creation
        f_transcribe = tk.Frame(p_main, bg=BG)
        f_vertical = tk.Frame(p_main, bg=BG)
        frames["transcribe"] = f_transcribe
        frames["vertical"] = f_vertical

        def show_sub(name):
            for f in frames.values(): f.pack_forget()
            frames[name].pack(fill="both", expand=True)
            for btn_id, b in sidebar_btns.items():
                if btn_id == name:
                    b.config(bg=ACCENT, fg="white")
                else:
                    b.config(bg=BG2, fg=FG)

        # Sidebar buttons
        sidebar_btns = {}
        b_tr = btn(p_sidebar, "🎙 Transcribe", lambda: show_sub("transcribe"), bg=BG2, pady=10)
        b_tr.pack(fill="x")
        sidebar_btns["transcribe"] = b_tr

        b_vt = btn(p_sidebar, "📱 Vertical (9:16)", lambda: show_sub("vertical"), bg=BG2, pady=10)
        b_vt.pack(fill="x")
        sidebar_btns["vertical"] = b_vt

        # ─── SUB-PAGE 1: Transcribe & AI ───
        pad = dict(padx=20, pady=8)
        
        # Source
        sec_src = section(f_transcribe, "Source Video")
        sec_src.pack(fill="x", **pad)
        
        r1 = tk.Frame(sec_src, bg=BG); r1.pack(fill="x", padx=10, pady=6)
        lbl(r1, "Folder video:").pack(side="left", padx=(0,10))
        entry(r1, self.var_tr_dir, width=40).pack(side="left", padx=5)
        btn(r1, "📁", lambda: self._browse_dir(self.var_tr_dir)).pack(side="left")

        r2 = tk.Frame(sec_src, bg=BG); r2.pack(fill="x", padx=10, pady=(0,8))
        lbl(r2, "File đơn lẻ:  ").pack(side="left", padx=(0,10))
        entry(r2, self.var_tr_file, width=40).pack(side="left", padx=5)
        btn(r2, "📄", lambda: self._browse_file(self.var_tr_file)).pack(side="left")

        # Options
        sec_opt = section(f_transcribe, "Transcription Options")
        sec_opt.pack(fill="x", **pad)
        
        orow = tk.Frame(sec_opt, bg=BG); orow.pack(fill="x", padx=10, pady=8)
        lbl(orow, "Model:").pack(side="left", padx=(0,5))
        cb_model = ttk.Combobox(orow, textvariable=self.var_tr_model, width=8,
                               values=["tiny","base","small","medium","large"], state="readonly")
        cb_model.pack(side="left", padx=(0,15))

        lbl(orow, "Language:").pack(side="left", padx=(0,5))
        entry(orow, self.var_tr_lang, width=5).pack(side="left", padx=(0,15))

        lbl(orow, "Output:").pack(side="left", padx=(0,5))
        entry(orow, self.var_tr_out, width=20).pack(side="left", padx=5)
        btn(orow, "📁", lambda: self._browse_dir(self.var_tr_out)).pack(side="left")

        orow2 = tk.Frame(sec_opt, bg=BG); orow2.pack(fill="x", padx=10, pady=(0,8))
        self.var_tr_srt  = tk.BooleanVar(value=False)
        self.var_tr_skip = tk.BooleanVar(value=True)
        self.var_tr_sc   = tk.BooleanVar(value=False)
        for t, v in [("Xuất file SRT", "var_tr_srt"), ("Bỏ qua nếu đã có", "var_tr_skip"), ("Phồn thể → Giản thể", "var_tr_sc")]:
            tk.Checkbutton(orow2, text=t, variable=getattr(self, v), bg=BG, fg=FG, selectcolor=SURF,
                           font=("Segoe UI", 10)).pack(side="left", padx=10)

        # Progress area (Shared)
        pf = tk.Frame(f_transcribe, bg=SURF, highlightbackground=SURF2, highlightthickness=1)
        pf.pack(fill="x", padx=20, pady=10)
        self.pb_tr_overall, self.lv_tr_overall = progress_row(pf, "Overall", 0)
        self.pb_tr_file,    self.lv_tr_file    = progress_row(pf, "File", 1)
        pf.columnconfigure(2, weight=1)

        self.tr_log = logbox(f_transcribe, height=10)
        self.tr_log.pack(fill="both", expand=True, padx=20, pady=5)

        f_actions = tk.Frame(f_transcribe, bg=BG)
        f_actions.pack(fill="x", padx=20, pady=10)
        self.btn_tr = btn(f_actions, "▶  Start Transcribing", self._start_transcribe, bg=ACCENT, fg="white", padx=25)
        self.btn_tr.pack(side="left")
        btn(f_actions, "🗑 Clear Log", lambda: self._clear_log(self.tr_log)).pack(side="left", padx=15)


        # ─── SUB-PAGE 2: Vertical Video ───
        sec_vert = section(f_vertical, "Vertical Conversion (9:16)")
        sec_vert.pack(fill="x", **pad)
        
        lbl(f_vertical, "Chuyển video ngang thành dọc chuyên dụng cho TikTok/Shorts.", fg=DIM).pack(padx=20, pady=(0,10), anchor="w")
        
        grid_v = tk.Frame(sec_vert, bg=BG)
        grid_v.pack(fill="x", padx=10, pady=10)
        
        self.var_vert_blur = tk.StringVar(value="40")
        self.var_vert_height = tk.StringVar(value="18")
        self.var_vert_shadow = tk.StringVar(value="0.55")
        
        v_fields = [
            ("Độ mạnh Blur:", self.var_vert_blur),
            ("Chiều cao lớp mờ (%):", self.var_vert_height),
            ("Độ đục bóng (0-1):", self.var_vert_shadow)
        ]
        for i, (l_text, v_var) in enumerate(v_fields):
            lbl(grid_v, l_text).grid(row=i, column=0, sticky="w", pady=5)
            entry(grid_v, v_var, width=10).grid(row=i, column=1, sticky="w", padx=10)

        btn(grid_v, "✨ Bắt đầu chuyển đổi 📱", lambda: self._toast("Đang phát triển trên Desktop..."), bg=CYAN, fg="black").grid(row=3, column=0, columnspan=2, pady=15, sticky="ew")

        # Set default sub-page
        show_sub("transcribe")

    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 5 — History
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_history(self, p):
        pad = dict(padx=14, pady=6)

        ctrl = tk.Frame(p, bg=BG); ctrl.pack(fill="x", **pad)
        btn(ctrl,"🔄  Refresh", self._load_history).pack(side="left", padx=4)
        btn(ctrl,"🗑  Clear All", self._clear_history, bg=RED, fg="white").pack(side="left",padx=4)
        tk.Label(ctrl, text="DB:", bg=BG, fg=DIM, font=("Segoe UI",9)).pack(side="left",padx=(12,4))
        self.var_db_path = tk.StringVar()
        entry(ctrl, self.var_db_path, width=32).pack(side="left")

        # treeview
        cols = ("time","url","type","total","success")
        self.tree = ttk.Treeview(p, columns=cols, show="headings", height=18)
        for col,w,title in [("time",150,"Time"),("url",340,"URL"),
                             ("type",80,"Type"),("total",60,"Total"),("success",60,"Success")]:
            self.tree.heading(col, text=title)
            self.tree.column(col, width=w, anchor="w")

        style = ttk.Style()
        style.configure("Treeview", background=SURF, foreground=FG,
                        fieldbackground=SURF, rowheight=24, font=("Segoe UI",9))
        style.configure("Treeview.Heading", background=SURF2, foreground=ACCENT,
                        font=("Segoe UI",9,"bold"))
        style.map("Treeview", background=[("selected",ACCENT)])

        vsb = ttk.Scrollbar(p, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y", padx=(0,14), pady=pad["pady"])
        self.tree.pack(fill="both", expand=True, padx=14, pady=pad["pady"])

    # ═══════════════════════════════════════════════════════════════════════════
    # Config actions
    # ═══════════════════════════════════════════════════════════════════════════
    def _load_all(self):
        cfg = load_cfg()
        links = cfg.get("link",[])
        self.txt_urls.delete("1.0","end")
        self.txt_urls.insert("end","\n".join(links if isinstance(links,list) else [links]))
        self.var_path.set(cfg.get("path","./Downloaded/"))
        modes = cfg.get("mode",[])
        for m,v in self.mode_vars.items(): v.set(m in modes)
        nums = cfg.get("number",{})
        for m,v in self.num_vars.items(): v.set(str(nums.get(m,0)))
        self.var_music.set(cfg.get("music",False))
        self.var_cover.set(cfg.get("cover",False))
        self.var_json.set(cfg.get("json",False))
        self.var_folder.set(cfg.get("folderstyle",False))
        self.var_thread.set(str(cfg.get("thread",5)))
        self.var_retry.set(str(cfg.get("retry_times",3)))
        self.var_proxy.set(cfg.get("proxy",""))
        self.var_start.set(cfg.get("start_time",""))
        self.var_end.set(cfg.get("end_time",""))
        cookies = cfg.get("cookies",{}) or {}
        for k,v in self.cookie_fields.items(): v.set(cookies.get(k,""))
        db_path = cfg.get("database_path","dy_downloader.db") or "dy_downloader.db"
        self.var_db_path.set(db_path)
        upload_cfg = cfg.get("upload") or {}
        self.var_auto_upload.set(bool(upload_cfg.get("auto_upload", False)))
        self.var_upload_platform.set(str(upload_cfg.get("platform") or "tiktok"))

    def _save_config(self):
        cfg = load_cfg()
        urls = [u.strip() for u in self.txt_urls.get("1.0","end").splitlines() if u.strip()]
        cfg.update({
            "link": urls,
            "path": self.var_path.get(),
            "mode": [m for m,v in self.mode_vars.items() if v.get()],
            "number": {m:int(v.get() or 0) for m,v in self.num_vars.items()},
            "music": self.var_music.get(),
            "cover": self.var_cover.get(),
            "json":  self.var_json.get(),
            "folderstyle": self.var_folder.get(),
            "thread": int(self.var_thread.get() or 5),
            "retry_times": int(self.var_retry.get() or 3),
            "proxy": self.var_proxy.get(),
            "start_time": self.var_start.get(),
            "end_time": self.var_end.get(),
        })
        upload_cfg = dict(cfg.get("upload") or {})
        upload_cfg["auto_upload"] = self.var_auto_upload.get()
        upload_cfg["platform"] = self.var_upload_platform.get()
        cfg["upload"] = upload_cfg
        save_cfg(cfg)
        self._toast("Config saved ✓")

    def _browse_path(self):
        d = filedialog.askdirectory(initialdir=self.var_path.get() or ".")
        if d: self.var_path.set(d)

    def _browse_dir(self, var):
        d = filedialog.askdirectory(initialdir=var.get() or ".")
        if d: var.set(d)

    def _browse_file(self, var):
        f = filedialog.askopenfilename(filetypes=[("MP4","*.mp4"),("All","*.*")])
        if f: var.set(f)

    # ═══════════════════════════════════════════════════════════════════════════
    # Cookie actions
    # ═══════════════════════════════════════════════════════════════════════════
    def _parse_cookie_str(self):
        raw = self.txt_cookie_raw.get("1.0","end").strip()
        if not raw: return
        from utils.cookie_utils import parse_cookie_header
        parsed = parse_cookie_header(raw)
        for k,v in self.cookie_fields.items():
            if k in parsed: v.set(parsed[k])
        self._toast(f"Parsed {len(parsed)} cookies")

    def _save_cookies(self):
        cfg = load_cfg()
        cfg["cookies"] = {k:v.get() for k,v in self.cookie_fields.items() if v.get()}
        save_cfg(cfg)
        self._toast("Cookies saved ✓")

    def _validate_cookies(self):
        from auth import CookieManager
        cm = CookieManager()
        cm.set_cookies({k:v.get() for k,v in self.cookie_fields.items() if v.get()})
        ok = cm.validate_cookies()
        if ok:
            self.var_cookie_status.set("🟢 Cookies look valid")
        else:
            self.var_cookie_status.set("🔴 Missing required keys (ttwid / odin_tt / passport_csrf_token)")

    def _auto_fetch_cookies(self):
        self._toast("Opening browser — log in then press Enter in terminal…")
        def run():
            import argparse
            from tools.cookie_fetcher import capture_cookies
            args = argparse.Namespace(
                url="https://www.douyin.com/", browser="chromium",
                headless=False, output=ROOT/"config"/"cookies.json",
                config=CONFIG_FILE, include_all=False,
            )
            asyncio.run(capture_cookies(args))
            self.after(0, self._reload_cookies)
        threading.Thread(target=run, daemon=True).start()

    def _reload_cookies(self):
        cfg = load_cfg()
        cookies = cfg.get("cookies",{}) or {}
        for k,v in self.cookie_fields.items(): v.set(cookies.get(k,""))
        self._toast("Cookies reloaded ✓")

    # ═══════════════════════════════════════════════════════════════════════════
    # Download actions
    # ═══════════════════════════════════════════════════════════════════════════
    def _start_download(self):
        if self._dl_running: return
        self._dl_running = True
        self.btn_dl.config(state="disabled", text="⏳  Running…")
        self._clear_log(self.dl_log)
        for pb in (self.pb_overall, self.pb_step, self.pb_item):
            pb["value"] = 0
        threading.Thread(target=self._run_download, daemon=True).start()

    def _run_download(self):
        try:
            import logging
            from config import ConfigLoader
            from auth import CookieManager
            from storage import Database
            from utils.logger import set_console_log_level
            set_console_log_level(logging.CRITICAL)

            prog = GUIProgress(
                log      = self._dl_log,
                set_step    = lambda p,l: self.after(0,self._set_dl_step,p,l),
                set_item    = lambda p,l: self.after(0,self._set_dl_item,p,l),
                set_overall = lambda p,l: self.after(0,self._set_dl_overall,p,l),
            )
            config = ConfigLoader(str(CONFIG_FILE))
            if not config.validate():
                self._dl_log("✗ Invalid config\n","error"); return

            cm = CookieManager()
            cm.set_cookies(config.get_cookies())
            if not cm.validate_cookies():
                self._dl_log("⚠ Cookies may be invalid\n","warning")

            db = None
            if config.get("database"):
                db = __import__("storage",fromlist=["Database"]).Database(
                    db_path=str(config.get("database_path","dy_downloader.db")))

            asyncio.run(self._async_dl(config, cm, db, prog))
        except Exception as e:
            self._dl_log(f"✗ Fatal: {e}\n","error")
        finally:
            self._dl_running = False
            self.after(0, lambda: self.btn_dl.config(state="normal", text="▶  Start Download"))

    async def _async_dl(self, config, cm, db, prog):
        from core.downloader_base import DownloadResult
        from storage import FileManager
        from control import QueueManager, RateLimiter, RetryHandler
        from core import DouyinAPIClient, URLParser, DownloaderFactory
        import json as _j

        if db:
            await db.initialize()
            prog.print_success("Database initialized")

        urls = config.get_links()
        prog.print_info(f"Found {len(urls)} URL(s)")
        prog.start_download_session(len(urls))
        results = []
        try:
            for i,url in enumerate(urls,1):
                prog.start_url(i,len(urls),url)
                orig = url
                try:
                    fm = FileManager(config.get("path"))
                    rl = RateLimiter(max_per_second=float(config.get("rate_limit",5) or 5))
                    rh = RetryHandler(max_retries=config.get("retry_times",3))
                    qm = QueueManager(max_workers=int(config.get("thread",5) or 5))
                    async with DouyinAPIClient(cm.get_cookies(), proxy=config.get("proxy")) as api:
                        prog.advance_step("解析链接","")
                        if url.startswith("https://v.douyin.com"):
                            r = await api.resolve_short_url(url)
                            if r: url=r
                        parsed = URLParser.parse(url)
                        if not parsed:
                            prog.fail_url("URL parse failed"); continue
                        prog.advance_step("创建下载器",parsed["type"])
                        dl = DownloaderFactory.create(
                            parsed["type"],config,api,fm,cm,db,rl,rh,qm,
                            progress_reporter=prog)
                        if not dl:
                            prog.fail_url("No downloader"); continue
                        prog.advance_step("执行下载","")
                        result = await dl.download(parsed)
                        prog.advance_step("记录历史","")
                        if result and db:
                            safe={k:v for k,v in config.config.items()
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
                    self._dl_log(f"✗ {e}\n","error")
        finally:
            prog.stop_download_session()
            if db: await db.close()

        if results:
            from core.downloader_base import DownloadResult
            tot = DownloadResult()
            for r in results:
                tot.total+=r.total; tot.success+=r.success
                tot.failed+=r.failed; tot.skipped+=r.skipped
            prog.show_result(tot)

    def _set_dl_overall(self,p,l): self.pb_overall["value"]=p; self.lv_overall.set(l)
    def _set_dl_step(self,p,l):    self.pb_step["value"]=p;    self.lv_step.set(l)
    def _set_dl_item(self,p,l):    self.pb_item["value"]=p;    self.lv_item.set(l)
    def _dl_log(self,t,tag="info"): self.after(0, log_write, self.dl_log, t, tag)

    # ═══════════════════════════════════════════════════════════════════════════
    # Transcribe actions
    # ═══════════════════════════════════════════════════════════════════════════
    def _start_transcribe(self):
        if self._tr_running: return
        self._tr_running = True
        self.btn_tr.config(state="disabled", text="⏳  Running…")
        self._clear_log(self.tr_log)
        self.pb_tr_overall["value"] = 0
        self.pb_tr_file["value"]    = 0
        threading.Thread(target=self._run_transcribe, daemon=True).start()

    def _run_transcribe(self):
        def tlog(t,tag="info"): self.after(0, log_write, self.tr_log, t, tag)
        def set_overall(p,l):   self.after(0,self._set_tr_overall,p,l)
        def set_file(p,l):      self.after(0,self._set_tr_file,p,l)
        try:
            import shutil, subprocess, tempfile, os as _os
            from cli.whisper_transcribe import (
                find_ffmpeg, find_videos, transcribe_file, _safe_stem)

            ffmpeg = find_ffmpeg()
            if not ffmpeg:
                tlog("✗ ffmpeg not found. Install via: conda install -c conda-forge ffmpeg\n","error")
                return

            try:
                import whisper
            except ImportError:
                tlog("✗ openai-whisper not installed. Run: pip install openai-whisper\n","error")
                return

            converter = None
            if self.var_tr_sc.get():
                try:
                    from opencc import OpenCC
                    converter = OpenCC("t2s")
                except ImportError:
                    tlog("⚠ OpenCC not installed, skipping conversion\n","warning")

            model_name = self.var_tr_model.get()
            tlog(f"ℹ Loading Whisper model: {model_name}…\n","info")
            model = whisper.load_model(model_name)
            tlog(f"✓ Model {model_name} loaded\n","success")

            single = self.var_tr_file.get().strip()
            if single:
                videos = [Path(single)]
            else:
                videos = find_videos(
                    self.var_tr_dir.get(),
                    skip_existing=self.var_tr_skip.get(),
                    output_dir=self.var_tr_out.get() or None)

            if not videos:
                tlog("⚠ No videos found\n","warning"); return

            tlog(f"ℹ Found {len(videos)} video(s)\n","info")
            fmts = {"txt"}
            if self.var_tr_srt.get(): fmts.add("srt")
            out_dir = self.var_tr_out.get().strip() or None

            set_overall(0, f"0/{len(videos)}")
            ok_count = fail_count = skip_count = 0

            for i,v in enumerate(videos,1):
                tlog(f"\n▶ [{i}/{len(videos)}] {v.name}\n","url")
                set_file(0, f"[{i}/{len(videos)}] extracting…")
                try:
                    ok = transcribe_file(v, model, ffmpeg, fmts,
                                         self.var_tr_lang.get(), converter, out_dir)
                    if ok:
                        ok_count += 1
                        tlog(f"✓ Done\n","success")
                        set_file(100, f"[{i}/{len(videos)}] done")
                    else:
                        fail_count += 1
                        tlog(f"✗ Failed\n","error")
                        set_file(100, f"[{i}/{len(videos)}] failed")
                except Exception as e:
                    fail_count += 1
                    tlog(f"✗ {e}\n","error")
                    set_file(100, f"[{i}/{len(videos)}] error")

                pct = int(i/len(videos)*100)
                set_overall(pct, f"{i}/{len(videos)}  ✓{ok_count} ✗{fail_count}")

            tlog(f"\n{'─'*44}\n成功:{ok_count}  失败:{fail_count}  跳过:{skip_count}\n{'─'*44}\n","result")
            set_overall(100,"完成")
        except Exception as e:
            tlog(f"✗ Fatal: {e}\n","error")
        finally:
            self._tr_running = False
            self.after(0, lambda: self.btn_tr.config(state="normal", text="▶  Start Transcribe"))

    def _set_tr_overall(self,p,l): self.pb_tr_overall["value"]=p; self.lv_tr_overall.set(l)
    def _set_tr_file(self,p,l):    self.pb_tr_file["value"]=p;    self.lv_tr_file.set(l)

    # ═══════════════════════════════════════════════════════════════════════════
    # History actions
    # ═══════════════════════════════════════════════════════════════════════════
    def _load_history(self):
        db_path = self.var_db_path.get() or "dy_downloader.db"
        async def fetch():
            from storage import Database
            from datetime import datetime
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
            for item in self.tree.get_children():
                self.tree.delete(item)
            from datetime import datetime
            for row in rows:
                ts = datetime.fromtimestamp(row[0]).strftime("%Y-%m-%d %H:%M") if row[0] else "—"
                url = (row[1] or "")[:60]
                self.tree.insert("","end", values=(ts,url,row[2],row[3],row[4]))
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def _clear_history(self):
        if not messagebox.askyesno("Confirm","Clear all download history?"): return
        db_path = self.var_db_path.get() or "dy_downloader.db"
        async def do_clear():
            from storage import Database
            db = Database(db_path=db_path)
            await db.initialize()
            conn = await db._get_conn()
            await conn.execute("DELETE FROM download_history")
            await conn.commit()
            await db.close()
        try:
            asyncio.run(do_clear())
            for item in self.tree.get_children():
                self.tree.delete(item)
            self._toast("History cleared ✓")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    # ═══════════════════════════════════════════════════════════════════════════
    # TAB 6 — TikTok Upload
    # ═══════════════════════════════════════════════════════════════════════════
    def _build_tiktok(self, p):
        import webbrowser, urllib.request

        # ── Auth section ──────────────────────────────────────────────────────
        auth_f = section(p, "🔐 TikTok Authentication")
        auth_f.pack(fill="x", padx=12, pady=(10, 4))

        self._tt_status_var = tk.StringVar(value="Chưa đăng nhập")
        lbl(auth_f, "Trạng thái:").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        tk.Label(auth_f, textvariable=self._tt_status_var, bg=SURF, fg=YELLOW,
                 font=("Segoe UI", 9)).grid(row=0, column=1, sticky="w", padx=6)

        btn(auth_f, "Đăng nhập TikTok", self._tiktok_login).grid(row=0, column=2, padx=6, pady=4)
        btn(auth_f, "Đăng xuất", self._tiktok_logout, bg=SURF2).grid(row=0, column=3, padx=6, pady=4)
        btn(auth_f, "Kiểm tra trạng thái", self._tiktok_check_status, bg=SURF2).grid(row=0, column=4, padx=6, pady=4)

        # ── Upload section ────────────────────────────────────────────────────
        up_f = section(p, "📤 Upload Video")
        up_f.pack(fill="x", padx=12, pady=4)

        lbl(up_f, "File video:").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        self._tt_video_var = tk.StringVar()
        entry(up_f, self._tt_video_var, width=50).grid(row=0, column=1, padx=4, pady=4)
        btn(up_f, "Chọn file", lambda: self._browse_file(self._tt_video_var), bg=SURF2).grid(row=0, column=2, padx=4)

        lbl(up_f, "Tiêu đề:").grid(row=1, column=0, sticky="w", padx=6, pady=4)
        self._tt_title_var = tk.StringVar()
        entry(up_f, self._tt_title_var, width=50).grid(row=1, column=1, padx=4, pady=4)

        lbl(up_f, "Quyền riêng tư:").grid(row=2, column=0, sticky="w", padx=6, pady=4)
        self._tt_privacy_var = tk.StringVar(value="SELF_ONLY")
        priv_cb = ttk.Combobox(up_f, textvariable=self._tt_privacy_var, width=20,
                               values=["SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "PUBLIC_TO_EVERYONE"],
                               state="readonly")
        priv_cb.grid(row=2, column=1, sticky="w", padx=4, pady=4)

        btn(up_f, "🚀 Upload lên TikTok", self._tiktok_upload).grid(row=3, column=1, sticky="w", padx=4, pady=8)

        # ── Log ───────────────────────────────────────────────────────────────
        log_f = section(p, "📋 Log")
        log_f.pack(fill="both", expand=True, padx=12, pady=4)
        self.tt_log = logbox(log_f, height=12)
        self.tt_log.pack(fill="both", expand=True, padx=6, pady=4)
        btn(log_f, "Xóa log", lambda: self._clear_log(self.tt_log), bg=SURF2).pack(anchor="e", padx=6, pady=2)

        # Check status on load
        self.after(500, self._tiktok_check_status)

    def _tiktok_check_status(self):
        import urllib.request, json as _j
        try:
            with urllib.request.urlopen("http://127.0.0.1:8080/api/tiktok_auth", timeout=5) as r:
                data = _j.loads(r.read())
            if data.get("authenticated"):
                acc = data.get("account", {})
                self._tt_status_var.set(f"✓ Đã đăng nhập (open_id: {acc.get('open_id','')[:12]}...)")
            else:
                self._tt_status_var.set("Chưa đăng nhập")
        except Exception:
            self._tt_status_var.set("Không kết nối được server")

    def _tiktok_login(self):
        import urllib.request, json as _j, webbrowser
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8080/api/tiktok_auth",
                data=b"{}",
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                data = _j.loads(r.read())
            auth_url = data.get("auth_url", "")
            if auth_url:
                webbrowser.open(auth_url)
                log_write(self.tt_log, "ℹ  Đã mở trình duyệt để đăng nhập TikTok. Sau khi xong hãy nhấn 'Kiểm tra trạng thái'.\n", "info")
            else:
                log_write(self.tt_log, f"✗  {data.get('error','Không lấy được auth URL')}\n", "error")
        except Exception as e:
            log_write(self.tt_log, f"✗  Lỗi: {e}\n", "error")

    def _tiktok_logout(self):
        import urllib.request, json as _j
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8080/api/tiktok_logout",
                data=b"{}",
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                _j.loads(r.read())
            self._tt_status_var.set("Chưa đăng nhập")
            log_write(self.tt_log, "ℹ  Đã đăng xuất TikTok.\n", "info")
        except Exception as e:
            log_write(self.tt_log, f"✗  Lỗi: {e}\n", "error")

    def _tiktok_upload(self):
        video_path = self._tt_video_var.get().strip()
        if not video_path:
            messagebox.showwarning("Thiếu file", "Vui lòng chọn file video.")
            return
        threading.Thread(target=self._run_tiktok_upload, daemon=True).start()

    def _run_tiktok_upload(self):
        import urllib.request, json as _j
        video_path = self._tt_video_var.get().strip()
        title = self._tt_title_var.get().strip()
        privacy = self._tt_privacy_var.get().strip()

        payload = _j.dumps({"video_path": video_path, "title": title, "privacy_level": privacy}).encode()
        self.after(0, log_write, self.tt_log, "▶  Bắt đầu upload...\n", "info")
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8080/api/tiktok_upload",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=360) as r:
                for line in r:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        msg = _j.loads(line)
                        level = msg.get("level", "info")
                        text = msg.get("log", "")
                        if text:
                            self.after(0, log_write, self.tt_log, text + "\n", level)
                    except Exception:
                        pass
        except Exception as e:
            self.after(0, log_write, self.tt_log, f"✗  Lỗi: {e}\n", "error")

    # ═══════════════════════════════════════════════════════════════════════════
    # Shared helpers
    # ═══════════════════════════════════════════════════════════════════════════
    def _clear_log(self, box):
        box.config(state="normal")
        box.delete("1.0","end")
        box.config(state="disabled")

    def _toast(self, msg):
        t = tk.Toplevel(self); t.overrideredirect(True); t.configure(bg=ACCENT)
        tk.Label(t, text=f"  {msg}  ", bg=ACCENT, fg="white",
                 font=("Segoe UI",10)).pack(padx=4, pady=6)
        x = self.winfo_x()+self.winfo_width()//2-130
        y = self.winfo_y()+self.winfo_height()-60
        t.geometry(f"+{x}+{y}")
        t.after(2200, t.destroy)


# ── entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    App().mainloop()
