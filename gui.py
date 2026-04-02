#!/usr/bin/env python3
"""Douyin Downloader - GUI"""
import asyncio
import json
import queue
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, scrolledtext, ttk
from typing import Optional

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import os
os.chdir(project_root)

# ── Event types ──────────────────────────────────────────────────────────────
EVT_LOG      = "log"
EVT_STEP     = "step"
EVT_ITEM_TOT = "item_total"
EVT_ITEM_ADV = "item_advance"
EVT_DONE     = "done"
EVT_ERROR    = "error"

COLORS = {
    "bg":       "#1e1e2e",
    "surface":  "#2a2a3e",
    "accent":   "#7c3aed",
    "accent2":  "#a78bfa",
    "success":  "#22c55e",
    "warning":  "#f59e0b",
    "error":    "#ef4444",
    "info":     "#38bdf8",
    "text":     "#e2e8f0",
    "muted":    "#64748b",
    "border":   "#374151",
}


# ── GUI Progress Reporter (replaces ProgressDisplay) ─────────────────────────
class GUIProgressReporter:
    """Bridges downloader events → GUI event queue."""

    _URL_STEP_TOTAL = 6

    def __init__(self, event_q: queue.Queue):
        self._q = event_q
        self._step = 0
        self._item_total = 0
        self._item_done = 0

    def _put(self, kind: str, **kw):
        self._q.put({"type": kind, **kw})

    # ── ProgressReporter protocol ─────────────────────────────────────────
    def update_step(self, step: str, detail: str = ""):
        self._put(EVT_STEP, step=step, detail=detail,
                  value=self._step, total=self._URL_STEP_TOTAL)

    def advance_step(self, step: str, detail: str = ""):
        self._step = min(self._step + 1, self._URL_STEP_TOTAL)
        self._put(EVT_STEP, step=step, detail=detail,
                  value=self._step, total=self._URL_STEP_TOTAL)

    def set_item_total(self, total: int, detail: str = ""):
        self._item_total = max(total, 1)
        self._item_done = 0
        self._put(EVT_ITEM_TOT, total=self._item_total, detail=detail)

    def advance_item(self, status: str, detail: str = ""):
        self._item_done = min(self._item_done + 1, self._item_total)
        self._put(EVT_ITEM_ADV, status=status, detail=detail,
                  value=self._item_done, total=self._item_total)

    # ── Extra helpers called from main_async ─────────────────────────────
    def show_banner(self): pass

    def print_info(self, msg: str):
        self._put(EVT_LOG, msg=msg, level="info")

    def print_success(self, msg: str):
        self._put(EVT_LOG, msg=msg, level="success")

    def print_warning(self, msg: str):
        self._put(EVT_LOG, msg=msg, level="warning")

    def print_error(self, msg: str):
        self._put(EVT_LOG, msg=msg, level="error")

    def start_download_session(self, total_urls: int):
        self._put(EVT_LOG, msg=f"Starting session — {total_urls} URL(s)", level="info")

    def stop_download_session(self): pass

    def start_url(self, index: int, total: int, url: str):
        self._step = 0
        self._put(EVT_LOG, msg=f"[{index}/{total}] {url}", level="info")
        self._put(EVT_STEP, step="Starting", detail=url,
                  value=0, total=self._URL_STEP_TOTAL)

    def complete_url(self, result=None):
        detail = ""
        if result:
            detail = f"✓ {result.success}  ✗ {result.failed}  ⊘ {result.skipped}"
        self._put(EVT_LOG, msg=f"URL complete — {detail}", level="success")

    def fail_url(self, reason: str):
        self._put(EVT_LOG, msg=f"URL failed — {reason}", level="error")
