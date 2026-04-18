/**
 * TranscribePage Component
 * Handles video/audio transcription with file upload, progress tracking, and TTS preview.
 */

import apiClient from '../../modules/api-client.js';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar.js';
import { LogBox } from '../../components/LogBox/LogBox.js';
import { Input } from '../../components/Input/Input.js';
import { Button } from '../../components/Button/Button.js';

const TTS_VOICE_PRESETS = {
  'fpt-ai': [
    { value: 'banmai', label: 'Ban Mai (FPT - Nữ)' },
    { value: 'thuminh', label: 'Thu Minh (FPT - Nữ)' },
    { value: 'myan', label: 'My An (FPT - Nữ)' },
    { value: 'leminh', label: 'Le Minh (FPT - Nam)' },
  ],
  'edge-tts': [
    { value: 'vi-VN-HoaiMyNeural', label: 'Hoai My (Edge - Nữ)' },
    { value: 'vi-VN-NamMinhNeural', label: 'Nam Minh (Edge - Nam)' },
  ],
  'minimax': [
    { value: 'Calm_Woman', label: 'Calm Woman (MiniMax - Nữ)' },
    { value: 'Gentle_Woman', label: 'Gentle Woman (MiniMax - Nữ)' },
    { value: 'Confident_Man', label: 'Confident Man (MiniMax - Nam)' },
  ],
  gtts: [{ value: 'vi', label: 'Vietnamese (gTTS)' }],
};

const TTS_DEFAULT_VOICE = {
  'fpt-ai': 'banmai',
  'edge-tts': 'vi-VN-HoaiMyNeural',
  'minimax': 'Calm_Woman',
  gtts: 'vi',
};

export class TranscribePage {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container] - Mount target
   */
  constructor(options = {}) {
    this.options = options;
    this._element = null;
    this._logBox = null;
    this._overallBar = null;
    this._fileBar = null;
    this._selectedFile = null;
    this._previewObjectUrl = null;
    this._mounted = false;

    this._init();
  }

  _init() {
    this._element = this._createElement();
    this._initComponents();
    this._attachListeners();
  }

  _createElement() {
    const section = document.createElement('section');
    section.className = 'transcribe-page';
    section.setAttribute('aria-labelledby', 'transcribe-page-title');
    section.innerHTML = this._buildHTML();
    return section;
  }

  _buildHTML() {
    return `
      <h2 id="transcribe-page-title" class="transcribe-page__title">Phiên Âm Video</h2>

      <div class="transcribe-page__grid">
        <!-- Input Card -->
        <div class="card transcribe-page__card">
          <div class="card__header"><h3 class="card__title">Nguồn Video</h3></div>
          <div class="card__body">
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-dir">Thư mục video</label>
              <input id="tr-dir" class="input" type="text" placeholder="./Downloaded" value="./Downloaded" aria-label="Thư mục video" />
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-file">File đơn (hoặc kéo thả)</label>
              <input id="tr-file" class="input" type="text" placeholder="Đường dẫn file .mp4 / .ass" aria-label="File đơn" />
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-import-file">Upload file</label>
              <input id="tr-import-file" class="input" type="file" accept="video/*,audio/*,.ass,.srt" aria-label="Upload file" />
              <span id="tr-import-file-name" class="transcribe-page__file-name">--</span>
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-out">Thư mục xuất</label>
              <input id="tr-out" class="input" type="text" placeholder="Mặc định: cùng thư mục nguồn" aria-label="Thư mục xuất" />
            </div>
          </div>
        </div>

        <!-- Settings Card -->
        <div class="card transcribe-page__card">
          <div class="card__header"><h3 class="card__title">Cài Đặt Phiên Âm</h3></div>
          <div class="card__body">
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-model">Model Whisper</label>
              <select id="tr-model" class="input" aria-label="Model Whisper">
                <option value="tiny">Tiny (nhanh nhất)</option>
                <option value="base" selected>Base</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large (chính xác nhất)</option>
              </select>
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-lang">Ngôn ngữ nguồn</label>
              <select id="tr-lang" class="input" aria-label="Ngôn ngữ nguồn">
                <option value="zh">Tiếng Trung</option>
                <option value="en">Tiếng Anh</option>
                <option value="ja">Tiếng Nhật</option>
                <option value="ko">Tiếng Hàn</option>
                <option value="vi">Tiếng Việt</option>
                <option value="auto">Tự động</option>
              </select>
            </div>
            <div class="transcribe-page__checkboxes">
              <label class="transcribe-page__checkbox-label">
                <input id="tr-srt" type="checkbox" /> Xuất file .srt
              </label>
              <label class="transcribe-page__checkbox-label">
                <input id="tr-skip" type="checkbox" checked /> Bỏ qua file đã xử lý
              </label>
              <label class="transcribe-page__checkbox-label">
                <input id="tr-sc" type="checkbox" /> Chuyển phồn thể → giản thể
              </label>
            </div>
          </div>
        </div>

        <!-- TTS Card -->
        <div class="card transcribe-page__card card-collapsible">
          <div class="card__header transcribe-page__card-toggle" role="button" tabindex="0" aria-expanded="false">
            <h3 class="card__title">Cài Đặt TTS (Giọng Đọc)</h3>
            <span class="card__toggle-icon" aria-hidden="true">▼</span>
          </div>
          <div class="card__body transcribe-page__collapsible-body" hidden>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-tts-engine">Engine TTS</label>
              <select id="tr-tts-engine" class="input" aria-label="Engine TTS">
                <option value="edge-tts">Edge TTS</option>
                <option value="fpt-ai">FPT AI</option>
                <option value="minimax">MiniMax</option>
                <option value="gtts">gTTS</option>
              </select>
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-tts-voice">Giọng đọc</label>
              <select id="tr-tts-voice" class="input" aria-label="Giọng đọc"></select>
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-tts-pitch">Pitch</label>
              <input id="tr-tts-pitch" class="input" type="text" value="+0Hz" aria-label="Pitch" />
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-tts-rate">Rate</label>
              <input id="tr-tts-rate" class="input" type="text" value="+0%" aria-label="Rate" />
            </div>
            <div class="transcribe-page__field">
              <label class="transcribe-page__label" for="tr-preview-text">Văn bản nghe thử</label>
              <textarea id="tr-preview-text" class="input transcribe-page__textarea" rows="2" placeholder="Nhập văn bản để nghe thử..." aria-label="Văn bản nghe thử"></textarea>
            </div>
            <div class="transcribe-page__actions">
              <button id="btn-tr-preview" class="btn btn--secondary btn--small" type="button">Nghe thử</button>
            </div>
            <audio id="tr-preview-audio" style="display:none;width:100%;margin-top:8px" controls aria-label="Audio preview"></audio>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div class="transcribe-page__progress" aria-live="polite" aria-label="Tiến trình phiên âm">
        <div class="transcribe-page__progress-row">
          <span class="transcribe-page__progress-label">Tổng tiến trình</span>
          <div id="tr-overall-bar"></div>
        </div>
        <div class="transcribe-page__progress-row">
          <span class="transcribe-page__progress-label">File hiện tại</span>
          <div id="tr-file-bar"></div>
        </div>
      </div>

      <!-- Log -->
      <div id="tr-log-container" class="transcribe-page__log"></div>

      <!-- Action buttons -->
      <div class="transcribe-page__footer">
        <button id="btn-tr-extract" class="btn btn--secondary" type="button">Tách MP3</button>
        <button id="btn-tr-tts" class="btn btn--secondary" type="button">Tạo MP3 từ .ass</button>
        <button id="btn-tr" class="btn btn--primary" type="button">Bắt đầu Phiên Âm</button>
      </div>
    `;
  }

  _initComponents() {
    // Progress bars
    const overallContainer = this._element.querySelector('#tr-overall-bar');
    const fileContainer = this._element.querySelector('#tr-file-bar');

    this._overallBar = new ProgressBar({ value: 0, label: '--', showLabel: true });
    this._fileBar = new ProgressBar({ value: 0, label: '--', showLabel: true });

    if (overallContainer) overallContainer.replaceWith(this._overallBar.element);
    if (fileContainer) fileContainer.replaceWith(this._fileBar.element);

    // Log box
    const logContainer = this._element.querySelector('#tr-log-container');
    this._logBox = new LogBox({ maxLines: 500, autoScroll: true });
    if (logContainer) logContainer.replaceWith(this._logBox.element);

    // Populate voice options
    this._syncVoiceOptions();
  }

  _attachListeners() {
    // File input
    const fileInput = this._element.querySelector('#tr-import-file');
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0] || null;
      this._selectedFile = file;
      const nameEl = this._element.querySelector('#tr-import-file-name');
      if (nameEl) nameEl.textContent = file ? file.name : '--';
    });

    // TTS engine change
    const engineSelect = this._element.querySelector('#tr-tts-engine');
    engineSelect?.addEventListener('change', () => this._syncVoiceOptions());

    // Collapsible card
    const toggle = this._element.querySelector('.transcribe-page__card-toggle');
    toggle?.addEventListener('click', () => this._toggleCard(toggle));
    toggle?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggleCard(toggle); }
    });

    // Buttons
    this._element.querySelector('#btn-tr')?.addEventListener('click', () => this.startTranscribe());
    this._element.querySelector('#btn-tr-extract')?.addEventListener('click', () => this.extractAudio());
    this._element.querySelector('#btn-tr-tts')?.addEventListener('click', () => this.generateTtsFromAss());
    this._element.querySelector('#btn-tr-preview')?.addEventListener('click', () => this.previewVoice());
  }

  _toggleCard(toggleEl) {
    const body = toggleEl.closest('.card-collapsible')?.querySelector('.transcribe-page__collapsible-body');
    if (!body) return;
    const isHidden = body.hidden;
    body.hidden = !isHidden;
    toggleEl.setAttribute('aria-expanded', String(isHidden));
  }

  _syncVoiceOptions() {
    const engineEl = this._element.querySelector('#tr-tts-engine');
    const voiceEl = this._element.querySelector('#tr-tts-voice');
    if (!engineEl || !voiceEl) return;

    const engine = engineEl.value || 'edge-tts';
    const preset = TTS_VOICE_PRESETS[engine] || TTS_VOICE_PRESETS['edge-tts'];
    const current = voiceEl.value;

    voiceEl.innerHTML = preset.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const keep = preset.some(p => p.value === current);
    voiceEl.value = keep ? current : (TTS_DEFAULT_VOICE[engine] || preset[0].value);
  }

  _getVal(id) {
    return this._element.querySelector(`#${id}`)?.value?.trim() || '';
  }

  _getChecked(id) {
    return this._element.querySelector(`#${id}`)?.checked ?? false;
  }

  _setButtonState(id, disabled, text) {
    const btn = this._element.querySelector(`#${id}`);
    if (btn) { btn.disabled = disabled; btn.textContent = text; }
  }

  async startTranscribe() {
    const folder = this._getVal('tr-dir') || './Downloaded';
    const single = this._getVal('tr-file');

    if (!folder && !single && !this._selectedFile) {
      alert('Vui lòng nhập thư mục video hoặc file đơn.');
      return;
    }

    this._setButtonState('btn-tr', true, 'Đang phiên âm...');
    this._logBox.clear();
    this._overallBar.setValue(0, '--');
    this._fileBar.setValue(0, '--');

    const payload = {
      folder,
      single,
      out_dir: this._getVal('tr-out'),
      model: this._getVal('tr-model') || 'base',
      lang: this._getVal('tr-lang') || 'zh',
      srt: this._getChecked('tr-srt'),
      skip: this._getChecked('tr-skip'),
      sc: this._getChecked('tr-sc'),
    };

    try {
      let response;
      if (this._selectedFile) {
        const form = new FormData();
        form.append('video_file', this._selectedFile);
        Object.entries(payload).forEach(([k, v]) => form.append(k, String(v ?? '')));
        response = await fetch('/api/transcribe', { method: 'POST', body: form });
      } else {
        response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok || !response.body) throw new Error('Không thể bắt đầu phiên âm');

      await this._readStream(response.body, (data) => {
        if (data.log) this._logBox.log(data.log, data.level || 'info');
        if (data.overall !== undefined || data.file !== undefined) {
          this._overallBar.setValue(data.overall ?? 0, data.overall_lbl || '--');
          this._fileBar.setValue(data.file ?? 0, data.file_lbl || '--');
        }
      });
    } catch (err) {
      this._logBox.log('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      this._setButtonState('btn-tr', false, 'Bắt đầu Phiên Âm');
    }
  }

  async extractAudio() {
    const filePath = this._getVal('tr-file');
    if (!filePath && !this._selectedFile) {
      alert('Vui lòng chọn file video trước.');
      return;
    }

    this._logBox.log('Đang tách MP3...', 'info');
    this._setButtonState('btn-tr-extract', true, 'Đang tách...');

    try {
      let res;
      if (this._selectedFile) {
        const form = new FormData();
        form.append('video_file', this._selectedFile);
        const outDir = this._getVal('tr-out');
        if (outDir) form.append('output_dir', outDir);
        res = await fetch('/api/extract_audio', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/extract_audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_path: filePath, output_dir: this._getVal('tr-out') }),
        });
      }
      const data = await res.json();
      if (data.ok) {
        this._logBox.log('✅ Tách MP3 thành công: ' + data.output_path, 'success');
      } else {
        this._logBox.log('❌ Lỗi: ' + (data.error || 'Unknown'), 'error');
      }
    } catch (err) {
      this._logBox.log('❌ Lỗi kết nối: ' + err.message, 'error');
    } finally {
      this._setButtonState('btn-tr-extract', false, 'Tách MP3');
    }
  }

  async generateTtsFromAss() {
    const filePath = this._getVal('tr-file');
    if (!filePath && !this._selectedFile) {
      alert('Vui lòng chọn file .ass trước.');
      return;
    }

    this._setButtonState('btn-tr-tts', true, 'Đang tạo...');
    this._logBox.clear();
    this._overallBar.setValue(0, '--');

    const params = {
      output_dir: this._getVal('tr-out'),
      tts_engine: this._getVal('tr-tts-engine') || 'edge-tts',
      tts_voice: this._getVal('tr-tts-voice') || 'vi-VN-HoaiMyNeural',
      tts_pitch: this._getVal('tr-tts-pitch') || '+0Hz',
      tts_rate: this._getVal('tr-tts-rate') || '+0%',
    };

    try {
      let res;
      if (this._selectedFile) {
        const form = new FormData();
        form.append('ass_file', this._selectedFile);
        Object.entries(params).forEach(([k, v]) => form.append(k, v));
        res = await fetch('/api/tts_from_ass', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/tts_from_ass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ass_path: filePath, ...params }),
        });
      }

      if (!res.ok || !res.body) throw new Error('Không thể kết nối server');

      await this._readStream(res.body, (data) => {
        if (data.log) this._logBox.log(data.log, data.level || 'info');
        if (data.overall !== undefined) this._overallBar.setValue(data.overall, data.overall_lbl || '--');
      });
    } catch (err) {
      this._logBox.log('❌ Lỗi kết nối: ' + err.message, 'error');
    } finally {
      this._setButtonState('btn-tr-tts', false, 'Tạo MP3 từ .ass');
    }
  }

  async previewVoice() {
    const text = this._getVal('tr-preview-text');
    if (!text) { alert('Vui lòng nhập nội dung để nghe thử giọng.'); return; }

    this._setButtonState('btn-tr-preview', true, 'Đang tạo giọng...');

    try {
      const res = await fetch('/api/tts_preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tts_engine: this._getVal('tr-tts-engine') || 'edge-tts',
          tts_voice: this._getVal('tr-tts-voice') || 'vi-VN-HoaiMyNeural',
          tts_pitch: this._getVal('tr-tts-pitch') || '+0Hz',
          tts_rate: this._getVal('tr-tts-rate') || '+0%',
        }),
      });

      if (!res.ok) throw new Error('Không thể tạo audio preview');

      const blob = await res.blob();
      const audio = this._element.querySelector('#tr-preview-audio');
      if (audio) {
        if (this._previewObjectUrl) URL.revokeObjectURL(this._previewObjectUrl);
        this._previewObjectUrl = URL.createObjectURL(blob);
        audio.src = this._previewObjectUrl;
        audio.style.display = 'block';
        try { await audio.play(); } catch (_) {}
      }
    } catch (err) {
      alert('Lỗi preview giọng: ' + err.message);
    } finally {
      this._setButtonState('btn-tr-preview', false, 'Nghe thử');
    }
  }

  /**
   * Read a streaming response and parse NDJSON lines
   * @param {ReadableStream} body
   * @param {Function} onData
   */
  async _readStream(body, onData) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          try { onData(JSON.parse(buffer.trim())); } catch (_) {}
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try { onData(JSON.parse(trimmed)); } catch (_) { onData({ log: trimmed }); }
      }
    }
  }

  mount(parent) {
    if (this._mounted) return;
    parent.appendChild(this._element);
    this._mounted = true;
  }

  unmount() {
    if (!this._mounted) return;
    if (this._previewObjectUrl) URL.revokeObjectURL(this._previewObjectUrl);
    if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
    this._mounted = false;
  }

  destroy() {
    this.unmount();
    this._logBox = null;
    this._overallBar = null;
    this._fileBar = null;
    this._element = null;
  }

  get element() { return this._element; }
}

export default TranscribePage;
