/**
 * ProcessPage Component — Xử lý Video
 *
 * Trang xử lý video với:
 * - Đồng bộ cấu hình từ /api/config
 * - Hàng chờ (queue) hiển thị bên phải
 * - Dừng tiến trình qua AbortController + /api/stop_process
 * - Tải file .srt / .ass
 * - Layout 2 cột (form trái, queue phải)
 *
 * @module pages/ProcessPage
 */

import ProgressBar from '../../components/ProgressBar/ProgressBar.js';
import LogBox from '../../components/LogBox/LogBox.js';
import { API_ENDPOINTS } from '../../modules/constants.js';

export class ProcessPage {
  constructor(options = {}) {
    this.options = options;

    // State
    this._isProcessing = false;
    this._selectedFile = null;
    this._lastOutputPath = null;
    this._abortController = null;
    this._queueItems = [];

    // DOM refs
    this._element = null;
    this._submitBtn = null;
    this._stopBtn = null;
    this._progressSection = null;
    this._progressContainer = null;
    this._logContainer = null;
    this._queueList = null;
    this._queueBadge = null;

    // Sub-components
    this._progressBar = null;
    this._logBox = null;

    // Bound handlers
    this._handleSubmit = this._handleSubmit.bind(this);
    this._handleStop = this._handleStop.bind(this);
    this._handleFileChange = this._handleFileChange.bind(this);

    this._mounted = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  init() {
    this._element = this._createElement();
    this._cacheRefs();
    this._initSubComponents();
    this._attachListeners();
  }

  mount(parent) {
    if (!this._element) this.init();
    parent.appendChild(this._element);
    this._mounted = true;
    // Load config and queue after mount
    this._loadConfig();
    this._loadQueue();
  }

  unmount() {
    if (!this._mounted) return;
    if (this._progressBar) { this._progressBar.destroy(); this._progressBar = null; }
    if (this._logBox) { this._logBox.destroy(); this._logBox = null; }
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._mounted = false;
  }

  // ─── Config Sync ────────────────────────────────────────────────────────────

  async _loadConfig() {
    try {
      const cfg = await fetch('/api/config').then(r => r.json());
      const vp = cfg.video_process || {};
      const q = (id) => this._element.querySelector(`#${id}`);

      const set = (id, val) => { const el = q(id); if (el && val !== undefined && val !== null) el.value = val; };
      const setChk = (id, val) => { const el = q(id); if (el && val !== undefined) el.checked = !!val; };

      set('pp-model', vp.model);
      set('pp-lang', vp.language);
      set('pp-tts-engine', vp.tts_engine);
      set('pp-tts-voice', vp.tts_voice);
      set('pp-font-size', vp.font_size);
      setChk('pp-burn-subs', vp.burn_subs);
      setChk('pp-translate-subs', vp.translate_subs);
      setChk('pp-blur-original', vp.blur_original);
      setChk('pp-voice-convert', vp.voice_convert);
      setChk('pp-afp', vp.afp_enabled);
      setChk('pp-keep-bgm', vp.keep_bgm);
      setChk('pp-auto-speed', vp.auto_speed);
    } catch (e) {
      console.warn('[ProcessPage] Config load failed:', e);
    }
  }

  // ─── Queue ──────────────────────────────────────────────────────────────────

  async _loadQueue() {
    try {
      const items = await fetch('/api/queue').then(r => r.json());
      this._queueItems = Array.isArray(items) ? items : (items.items || []);
      this._renderQueue();
    } catch (e) {
      console.warn('[ProcessPage] Queue load failed:', e);
    }
  }

  _renderQueue() {
    if (!this._queueList) return;
    const items = this._queueItems;

    if (this._queueBadge) {
      this._queueBadge.textContent = items.length;
      this._queueBadge.style.display = items.length > 0 ? 'inline-flex' : 'none';
    }

    if (!items.length) {
      this._queueList.innerHTML = '<li class="pp-queue__empty">Hàng chờ trống</li>';
      return;
    }

    this._queueList.innerHTML = items.map((item, idx) => {
      const label = item.desc || item.url || item.video_url || `Mục ${idx + 1}`;
      const short = label.length > 50 ? label.slice(0, 47) + '…' : label;
      const rawUrl = item.url || item.video_url || '';
      const shortUrl = rawUrl.length > 50 ? rawUrl.slice(0, 47) + '…' : rawUrl;
      const esc = (s) => this._esc(s);
      return `
        <li class="pp-queue__item" data-idx="${idx}">
          ${item.cover ? `<img class="pp-queue__thumb" src="/api/proxy_image?url=${encodeURIComponent(item.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="pp-queue__thumb pp-queue__thumb--placeholder">▶</div>'}
          <div class="pp-queue__item-info">
            <span class="pp-queue__item-label" title="${esc(label)}">${esc(short)}</span>
            <span class="pp-queue__item-url">${esc(shortUrl)}</span>
          </div>
          <button type="button" class="pp-queue__remove-btn" data-idx="${idx}" aria-label="Xóa">✕</button>
        </li>
      `;
    }).join('');
  }

  async _removeQueueItem(idx) {
    const item = this._queueItems[idx];
    if (!item) return;
    try {
      await fetch('/api/queue/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url || item.video_url }),
      });
    } catch (_) {}
    this._queueItems.splice(idx, 1);
    this._renderQueue();
  }

  // ─── DOM Construction ───────────────────────────────────────────────────────

  _createElement() {
    const page = document.createElement('div');
    page.className = 'process-page';
    page.innerHTML = this._template();
    return page;
  }

  _template() {
    return `
      <div class="process-page__header">
        <h1 class="process-page__title">Xử lý Video</h1>
        <p class="process-page__subtitle">Tải và xử lý video với phụ đề, chuyển giọng và chống dấu vân tay.</p>
      </div>

      <div class="process-page__layout">

        <!-- ── Form ── -->
        <div class="process-page__col process-page__col--form">
          <form class="process-page__form" id="pp-form" novalidate aria-label="Form xử lý video">

            <!-- Nguồn video -->
            <div class="process-page__field">
              <label class="process-page__label" for="pp-url">Nguồn video</label>
              <div class="process-page__input-row">
                <input
                  type="url"
                  id="pp-url"
                  class="process-page__input"
                  placeholder="Dán URL TikTok / YouTube..."
                  autocomplete="off"
                />
                <label class="process-page__file-btn" for="pp-file" title="Chọn file video">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <input type="file" id="pp-file" class="process-page__file-input" accept="video/*" aria-label="Chọn file video" />
                </label>
              </div>
              <span class="process-page__file-name" id="pp-file-name"></span>
            </div>

            <!-- Thư mục xuất -->
            <div class="process-page__field">
              <label class="process-page__label" for="pp-out-dir">Thư mục xuất <span class="process-page__label-hint">(tuỳ chọn)</span></label>
              <input type="text" id="pp-out-dir" class="process-page__input" placeholder="Để trống dùng thư mục mặc định" />
            </div>

            <!-- Whisper model + Ngôn ngữ -->
            <div class="process-page__row">
              <div class="process-page__field">
                <label class="process-page__label" for="pp-model">Whisper model</label>
                <select id="pp-model" class="process-page__select">
                  <option value="tiny">tiny</option>
                  <option value="base">base</option>
                  <option value="small" selected>small</option>
                  <option value="medium">medium</option>
                  <option value="large">large</option>
                </select>
              </div>
              <div class="process-page__field">
                <label class="process-page__label" for="pp-lang">Ngôn ngữ nguồn</label>
                <select id="pp-lang" class="process-page__select">
                  <option value="zh">Tiếng Trung (zh)</option>
                  <option value="en">Tiếng Anh (en)</option>
                  <option value="ja">Tiếng Nhật (ja)</option>
                  <option value="ko">Tiếng Hàn (ko)</option>
                  <option value="vi">Tiếng Việt (vi)</option>
                </select>
              </div>
            </div>

            <!-- TTS Engine + Giọng đọc -->
            <div class="process-page__row">
              <div class="process-page__field">
                <label class="process-page__label" for="pp-tts-engine">TTS Engine</label>
                <select id="pp-tts-engine" class="process-page__select">
                  <option value="edge">Edge TTS</option>
                  <option value="gtts">gTTS</option>
                  <option value="piper">Piper</option>
                  <option value="hf">HuggingFace</option>
                </select>
              </div>
              <div class="process-page__field">
                <label class="process-page__label" for="pp-tts-voice">Giọng đọc</label>
                <input type="text" id="pp-tts-voice" class="process-page__input" placeholder="vi-VN-HoaiMyNeural" />
              </div>
            </div>

            <!-- Cỡ chữ phụ đề -->
            <div class="process-page__field process-page__field--inline">
              <label class="process-page__label" for="pp-font-size">Cỡ chữ phụ đề</label>
              <input type="number" id="pp-font-size" class="process-page__input process-page__input--sm" value="24" min="8" max="72" />
            </div>

            <!-- Tuỳ chọn xử lý -->
            <fieldset class="process-page__fieldset">
              <legend class="process-page__legend">Tuỳ chọn xử lý</legend>
              <div class="process-page__options">
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-burn-subs" class="process-page__checkbox" checked />
                  <span>Ghi phụ đề</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-translate-subs" class="process-page__checkbox" checked />
                  <span>Dịch phụ đề</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-blur-original" class="process-page__checkbox" checked />
                  <span>Làm mờ phụ đề gốc</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-voice-convert" class="process-page__checkbox" />
                  <span>Đổi giọng</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-keep-bgm" class="process-page__checkbox" />
                  <span>Giữ nhạc nền</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-auto-speed" class="process-page__checkbox" />
                  <span>Tự động tốc độ</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-afp" class="process-page__checkbox" />
                  <span>Chống dấu vân tay</span>
                </label>
              </div>
            </fieldset>

            <!-- Tải file phụ đề -->
            <fieldset class="process-page__fieldset">
              <legend class="process-page__legend">Tải file phụ đề</legend>
              <div class="process-page__options">
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-dl-srt" class="process-page__checkbox" />
                  <span>Tải file .srt</span>
                </label>
                <label class="process-page__checkbox-label">
                  <input type="checkbox" id="pp-dl-ass-vi" class="process-page__checkbox" />
                  <span>Tải file .ass (tiếng Việt)</span>
                </label>
              </div>
            </fieldset>

            <!-- Nút hành động -->
            <div class="process-page__actions">
              <button type="submit" id="pp-submit" class="process-page__submit-btn" aria-label="Bắt đầu xử lý video">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Xử lý Video
              </button>
              <button type="button" id="pp-queue-process" class="process-page__submit-btn process-page__submit-btn--secondary" aria-label="Xử lý từ hàng chờ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Xử lý từ hàng chờ
              </button>
              <button type="button" id="pp-stop" class="process-page__stop-btn" aria-label="Dừng tiến trình" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                </svg>
                Dừng
              </button>
            </div>

          </form>

          <!-- Tiến trình -->
          <section class="process-page__progress process-page__progress--hidden" id="pp-progress" aria-label="Tiến trình xử lý" aria-live="polite">
            <div class="process-page__progress-header">
              <h2 class="process-page__progress-title">Đang xử lý…</h2>
            </div>
            <div class="process-page__progress-bar" id="pp-progress-bar"></div>
            <div class="process-page__log" id="pp-log"></div>
          </section>
        </div>

        <!-- ── Hàng chờ (below form) ── -->
        <div class="process-page__col process-page__col--queue">
          <div class="process-page__queue-card">
            <div class="process-page__queue-header">
              <h2 class="process-page__queue-title">
                Hàng chờ
                <span class="process-page__queue-badge" id="pp-queue-badge" style="display:none">0</span>
              </h2>
              <button type="button" class="process-page__queue-refresh" id="pp-queue-refresh" aria-label="Làm mới hàng chờ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
              </button>
            </div>
            <ul class="pp-queue__list" id="pp-queue-list" aria-label="Danh sách hàng chờ">
              <li class="pp-queue__empty">Hàng chờ trống</li>
            </ul>
          </div>
        </div>

      </div>
    `;
  }

  _cacheRefs() {
    const q = (id) => this._element.querySelector(`#${id}`);
    this._submitBtn = q('pp-submit');
    this._stopBtn = q('pp-stop');
    this._progressSection = q('pp-progress');
    this._progressContainer = q('pp-progress-bar');
    this._logContainer = q('pp-log');
    this._queueList = q('pp-queue-list');
    this._queueBadge = q('pp-queue-badge');
  }

  // ─── Sub-components ─────────────────────────────────────────────────────────

  _initSubComponents() {
    this._progressBar = new ProgressBar({
      mode: 'determinate',
      progress: 0,
      label: 'Đang bắt đầu…',
      showPercentage: true,
      variant: 'primary',
      size: 'medium',
    });
    this._progressBar.mount(this._progressContainer);

    this._logBox = new LogBox({
      maxEntries: 500,
      autoScroll: true,
      density: 'compact',
      showTimestamp: true,
    });
    this._logBox.mount(this._logContainer);
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  _attachListeners() {
    const form = this._element.querySelector('#pp-form');
    form.addEventListener('submit', this._handleSubmit);

    this._stopBtn.addEventListener('click', this._handleStop);

    const fileInput = this._element.querySelector('#pp-file');
    fileInput.addEventListener('change', this._handleFileChange);

    const refreshBtn = this._element.querySelector('#pp-queue-refresh');
    refreshBtn.addEventListener('click', () => this._loadQueue());

    const queueProcessBtn = this._element.querySelector('#pp-queue-process');
    if (queueProcessBtn) {
      queueProcessBtn.addEventListener('click', () => {
        if (!this._isProcessing) this._startProcessing(true);
      });
    }

    // Queue remove delegation
    this._queueList.addEventListener('click', (e) => {
      const btn = e.target.closest('.pp-queue__remove-btn');
      if (btn) {
        const idx = parseInt(btn.dataset.idx, 10);
        this._removeQueueItem(idx);
      }
    });
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async _handleSubmit(e) {
    e.preventDefault();
    if (this._isProcessing) return;
    await this._startProcessing();
  }

  _handleStop() {
    this._stopProcessing();
  }

  _handleFileChange(e) {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    this._selectedFile = file;
    const nameEl = this._element.querySelector('#pp-file-name');
    if (nameEl) nameEl.textContent = file ? file.name : '';
  }

  // ─── Processing ─────────────────────────────────────────────────────────────

  async _startProcessing(forceQueueItem = false) {
    this._isProcessing = true;
    this._setSubmitState(true);
    this._showProgress();
    this._progressBar.reset();
    this._progressBar.setLabel('Đang bắt đầu…');
    this._logBox.clearLogs();

    const q = (id) => this._element.querySelector(`#${id}`);

    // Determine video source
    const urlVal = q('pp-url')?.value?.trim() || '';
    let videoUrl = urlVal;
    let videoPath = this._selectedFile ? this._selectedFile.name : '';

    // If neither URL nor file, fall back to first queue item
    if (forceQueueItem || (!videoUrl && !videoPath)) {
      const firstItem = this._queueItems[0];
      if (firstItem) {
        videoUrl = firstItem.url || firstItem.video_url || '';
        this._logBox.addLog('info', `Xử lý từ hàng chờ: ${videoUrl}`);
      } else {
        this._logBox.addLog('error', 'Vui lòng nhập URL video hoặc chọn file, hoặc thêm video vào hàng chờ.');
        this._isProcessing = false;
        this._setSubmitState(false);
        return;
      }
    }

    const payload = {
      video_url: videoUrl,
      video_path: videoPath,
      out_dir: q('pp-out-dir')?.value?.trim() || '',
      model: q('pp-model')?.value || 'small',
      language: q('pp-lang')?.value || 'zh',
      tts_engine: q('pp-tts-engine')?.value || 'edge',
      tts_voice: q('pp-tts-voice')?.value?.trim() || '',
      font_size: parseInt(q('pp-font-size')?.value || '24', 10),
      burn_subs: q('pp-burn-subs')?.checked ?? true,
      translate_subs: q('pp-translate-subs')?.checked ?? true,
      blur_original: q('pp-blur-original')?.checked ?? true,
      voice_convert: q('pp-voice-convert')?.checked ?? false,
      keep_bgm: q('pp-keep-bgm')?.checked ?? false,
      auto_speed: q('pp-auto-speed')?.checked ?? false,
      afp_enabled: q('pp-afp')?.checked ?? false,
      download_srt: q('pp-dl-srt')?.checked ?? false,
      download_ass_vi: q('pp-dl-ass-vi')?.checked ?? false,
    };

    try {
      await this._streamProcessVideo(payload);
    } catch (err) {
      if (err.name !== 'AbortError') {
        this._logBox.addLog('error', `Lỗi kết nối: ${err.message || err}`);
      }
    } finally {
      this._isProcessing = false;
      this._abortController = null;
      this._setSubmitState(false);
      this._loadQueue();
    }
  }

  _stopProcessing() {
    this._abortController?.abort();
    fetch('/api/stop_process', { method: 'POST' }).catch(() => {});
    this._logBox?.addLog('warning', 'Đã gửi lệnh dừng tiến trình.');
  }

  async _streamProcessVideo(payload) {
    this._abortController = new AbortController();

    const response = await fetch(API_ENDPOINTS.PROCESS_VIDEO || '/api/process_video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: this._abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Lỗi máy chủ: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) this._handleStreamLine(buffer.trim());
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) this._handleStreamLine(trimmed);
      }
    }
  }

  _handleStreamLine(line) {
    try {
      const data = JSON.parse(line);

      if (data.log) {
        const level = this._mapLogLevel(data.level || 'info');
        this._logBox.addLog(level, data.log);
        const match = data.log.match(/[:\s]([^\s]+\.mp4)/);
        if (match) this._lastOutputPath = match[1];
      }

      if (data.file_path) this._lastOutputPath = data.file_path;

      if (data.overall !== undefined) {
        this._progressBar.setProgress(Number(data.overall) || 0);
        if (data.overall_lbl) this._progressBar.setLabel(data.overall_lbl);
      }

      if (data.ok === true) {
        this._logBox.addLog('success', 'Xử lý hoàn tất' + (this._lastOutputPath ? `: ${this._lastOutputPath}` : ''));
        this._progressBar.setProgress(100);
        this._progressBar.setLabel('Hoàn tất');
      }

      if (data.ok === false) {
        this._logBox.addLog('error', `Xử lý thất bại: ${data.error || 'Lỗi không xác định'}`);
      }
    } catch (_) {
      if (line.trim()) this._logBox.addLog('info', line);
    }
  }

  _mapLogLevel(level) {
    const map = { info: 'info', success: 'success', warning: 'warning', warn: 'warning', error: 'error', debug: 'info' };
    return map[level] || 'info';
  }

  // ─── UI Helpers ──────────────────────────────────────────────────────────────

  _showProgress() {
    this._progressSection?.classList.remove('process-page__progress--hidden');
  }

  _setSubmitState(processing) {
    if (this._submitBtn) {
      this._submitBtn.disabled = processing;
      this._submitBtn.querySelector('span') && (this._submitBtn.querySelector('span').textContent = processing ? 'Đang xử lý…' : 'Xử lý Video');
    }
    if (this._stopBtn) {
      this._stopBtn.disabled = !processing;
    }
  }

  _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  get element() { return this._element; }
  get mounted() { return this._mounted; }
  get isProcessing() { return this._isProcessing; }
}

export default ProcessPage;
