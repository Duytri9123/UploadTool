/**
 * ConfigPage Component
 * Application configuration form with validation, save/reset functionality,
 * and StateManager integration.
 */

import apiClient from '../../modules/api-client.js';

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
    { value: 'Confident_Man', label: 'Confident Man (MiniMax - Nam)' },
  ],
  gtts: [{ value: 'vi', label: 'Vietnamese (gTTS)' }],
};

export class ConfigPage {
  constructor(options = {}) {
    this.options = options;
    this._element = null;
    this._mounted = false;
    this._loadedConfig = null;
    this._dirty = false;

    this._init();
  }

  _init() {
    this._element = this._createElement();
    this._attachListeners();
  }

  _createElement() {
    const section = document.createElement('section');
    section.className = 'config-page';
    section.setAttribute('aria-labelledby', 'config-page-title');
    section.innerHTML = this._buildHTML();
    return section;
  }

  _buildHTML() {
    return `
      <div class="config-page__header">
        <h2 id="config-page-title" class="config-page__title">Cấu Hình</h2>
        <div class="config-page__header-actions">
          <button id="btn-cfg-reset" class="btn btn--secondary btn--small" type="button">Đặt lại</button>
          <button id="btn-cfg-save" class="btn btn--primary btn--small" type="button">Lưu cấu hình</button>
        </div>
      </div>

      <form id="config-form" class="config-page__form" novalidate aria-label="Form cấu hình">

        <!-- Basic Settings -->
        <div class="card config-page__card">
          <div class="card__header"><h3 class="card__title">Cài Đặt Cơ Bản</h3></div>
          <div class="card__body config-page__grid">
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-urls">URLs (mỗi dòng một URL)</label>
              <textarea id="cfg-urls" class="input config-page__textarea" rows="4" placeholder="https://www.douyin.com/user/..." aria-label="Danh sách URLs"></textarea>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-path">Thư mục tải xuống</label>
              <input id="cfg-path" class="input" type="text" value="./Downloaded/" aria-label="Thư mục tải xuống" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-proxy">Proxy</label>
              <input id="cfg-proxy" class="input" type="text" placeholder="http://127.0.0.1:7890" aria-label="Proxy" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-thread">Số luồng tải</label>
              <input id="cfg-thread" class="input" type="number" value="5" min="1" max="20" aria-label="Số luồng tải" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-retry">Số lần thử lại</label>
              <input id="cfg-retry" class="input" type="number" value="3" min="0" max="10" aria-label="Số lần thử lại" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-start">Ngày bắt đầu</label>
              <input id="cfg-start" class="input" type="text" placeholder="YYYY-MM-DD" aria-label="Ngày bắt đầu" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-end">Ngày kết thúc</label>
              <input id="cfg-end" class="input" type="text" placeholder="YYYY-MM-DD" aria-label="Ngày kết thúc" />
            </div>
          </div>
        </div>

        <!-- Download Modes -->
        <div class="card config-page__card">
          <div class="card__header"><h3 class="card__title">Chế Độ Tải</h3></div>
          <div class="card__body">
            <div id="mode-checks" class="config-page__checkboxes" role="group" aria-label="Chế độ tải">
              ${['post','like','collect','music','mix','collectmix'].map(m => `
                <label class="config-page__checkbox-label">
                  <input type="checkbox" value="${m}" name="mode" /> ${m}
                </label>
              `).join('')}
            </div>
            <div class="config-page__grid config-page__grid--counts">
              ${['post','like','collect','music','mix','collectmix'].map(m => `
                <div class="config-page__field">
                  <label class="config-page__label" for="n-${m}">Max ${m}</label>
                  <input id="n-${m}" class="input" type="number" value="0" min="0" aria-label="Max ${m}" />
                </div>
              `).join('')}
            </div>
            <div class="config-page__checkboxes config-page__checkboxes--options">
              <label class="config-page__checkbox-label"><input id="opt-music" type="checkbox" /> Tải nhạc</label>
              <label class="config-page__checkbox-label"><input id="opt-cover" type="checkbox" /> Tải ảnh bìa</label>
              <label class="config-page__checkbox-label"><input id="opt-json" type="checkbox" /> Lưu JSON</label>
              <label class="config-page__checkbox-label"><input id="opt-folder" type="checkbox" /> Tạo thư mục riêng</label>
            </div>
          </div>
        </div>

        <!-- Translation Settings -->
        <div class="card config-page__card">
          <div class="card__header"><h3 class="card__title">Cài Đặt Dịch Thuật</h3></div>
          <div class="card__body config-page__grid">
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-preferred-provider">Provider dịch</label>
              <select id="cfg-preferred-provider" class="input" aria-label="Provider dịch">
                <option value="auto">Tự động</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-deepseek-key">DeepSeek API Key</label>
              <input id="cfg-deepseek-key" class="input" type="password" placeholder="sk-..." aria-label="DeepSeek API Key" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-groq-key">Groq API Key</label>
              <input id="cfg-groq-key" class="input" type="password" placeholder="gsk_..." aria-label="Groq API Key" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-groq-model">Groq Model</label>
              <input id="cfg-groq-model" class="input" type="text" value="llama-3.1-8b-instant" aria-label="Groq Model" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-openai-key">OpenAI API Key</label>
              <input id="cfg-openai-key" class="input" type="password" placeholder="sk-..." aria-label="OpenAI API Key" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-hf-token">HuggingFace Token</label>
              <input id="cfg-hf-token" class="input" type="password" placeholder="hf_..." aria-label="HuggingFace Token" />
            </div>
            <div class="config-page__field config-page__field--full">
              <label class="config-page__checkbox-label">
                <input id="cfg-naming-enabled" type="checkbox" checked /> Đặt tên file theo nội dung
              </label>
            </div>
          </div>
        </div>

        <!-- Video Processing -->
        <div class="card config-page__card">
          <div class="card__header"><h3 class="card__title">Xử Lý Video</h3></div>
          <div class="card__body config-page__grid">
            <div class="config-page__field config-page__field--full">
              <label class="config-page__checkbox-label">
                <input id="vp-enabled" type="checkbox" checked /> Bật xử lý video sau khi tải
              </label>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-model">Model Whisper</label>
              <select id="vp-model" class="input" aria-label="Model Whisper">
                <option value="tiny">Tiny</option>
                <option value="base" selected>Base</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-lang">Ngôn ngữ nguồn</label>
              <select id="vp-lang" class="input" aria-label="Ngôn ngữ nguồn">
                <option value="zh">Tiếng Trung</option>
                <option value="en">Tiếng Anh</option>
                <option value="ja">Tiếng Nhật</option>
                <option value="ko">Tiếng Hàn</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-tts-engine">TTS Engine</label>
              <select id="vp-tts-engine" class="input" aria-label="TTS Engine">
                <option value="edge-tts">Edge TTS</option>
                <option value="fpt-ai">FPT AI</option>
                <option value="minimax">MiniMax</option>
                <option value="gtts">gTTS</option>
              </select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-tts-voice">Giọng đọc</label>
              <select id="vp-tts-voice" class="input" aria-label="Giọng đọc"></select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-font-size">Cỡ chữ phụ đề</label>
              <input id="vp-font-size" class="input" type="number" value="22" min="10" max="60" aria-label="Cỡ chữ phụ đề" />
            </div>
            <div class="config-page__field config-page__field--full">
              <div class="config-page__checkboxes">
                <label class="config-page__checkbox-label"><input id="vp-burn" type="checkbox" checked /> Ghi phụ đề vào video</label>
                <label class="config-page__checkbox-label"><input id="vp-blur-original" type="checkbox" /> Làm mờ phụ đề gốc</label>
                <label class="config-page__checkbox-label"><input id="vp-translate" type="checkbox" checked /> Dịch phụ đề</label>
                <label class="config-page__checkbox-label"><input id="vp-burn-vi" type="checkbox" checked /> Ghi phụ đề tiếng Việt</label>
                <label class="config-page__checkbox-label"><input id="vp-voice" type="checkbox" checked /> Đổi giọng tiếng Việt</label>
                <label class="config-page__checkbox-label"><input id="vp-keep-bg" type="checkbox" /> Giữ nhạc nền</label>
                <label class="config-page__checkbox-label"><input id="vp-auto-speed" type="checkbox" checked /> Tự động điều chỉnh tốc độ</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Anti-fingerprint -->
        <div class="card config-page__card" style="margin-top:16px">
          <div class="card__header">
            <h3 class="card__title">Anti-fingerprint (Chống dấu vân tay)</h3>
          </div>
          <div class="card__body config-page__grid">
            <div class="config-page__field config-page__field--full">
              <label class="config-page__checkbox-label">
                <input id="vp-afp-enabled" type="checkbox" /> Bật chống dấu vân tay
              </label>
            </div>
            <div class="config-page__field config-page__field--full">
              <div class="config-page__checkboxes">
                <label class="config-page__checkbox-label"><input id="vp-afp-flip" type="checkbox" /> Lật ngang (flip_h)</label>
                <label class="config-page__checkbox-label"><input id="vp-afp-vignette" type="checkbox" /> Vignette</label>
                <label class="config-page__checkbox-label"><input id="vp-afp-vertical" type="checkbox" /> Chuyển dọc</label>
              </div>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-afp-brightness">Độ sáng</label>
              <input id="vp-afp-brightness" class="input" type="number" value="0.02" step="0.01" min="-1" max="1" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-afp-contrast">Tương phản</label>
              <input id="vp-afp-contrast" class="input" type="number" value="1.03" step="0.01" min="0.5" max="2" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-afp-scale-w">Scale W</label>
              <input id="vp-afp-scale-w" class="input" type="number" value="0" min="-100" max="100" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-afp-scale-h">Scale H</label>
              <input id="vp-afp-scale-h" class="input" type="number" value="0" min="-100" max="100" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="vp-afp-overlay-img">Overlay image path</label>
              <input id="vp-afp-overlay-img" class="input" type="text" placeholder="Đường dẫn ảnh overlay (tuỳ chọn)" />
            </div>
          </div>
        </div>

        <!-- Upload Settings -->
        <div class="card config-page__card">
          <div class="card__header"><h3 class="card__title">Cài Đặt Upload</h3></div>
          <div class="card__body config-page__grid">
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-upload-platform">Nền tảng mặc định</label>
              <select id="cfg-upload-platform" class="input" aria-label="Nền tảng upload">
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="both">Cả hai</option>
              </select>
            </div>
            <div class="config-page__field config-page__field--full">
              <label class="config-page__checkbox-label">
                <input id="cfg-upload-auto" type="checkbox" /> Tự động upload sau khi xử lý
              </label>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-yt-title-template">YouTube: Template tiêu đề</label>
              <input id="cfg-yt-title-template" class="input" type="text" value="{title}" aria-label="YouTube title template" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-yt-privacy">YouTube: Quyền riêng tư</label>
              <select id="cfg-yt-privacy" class="input" aria-label="YouTube privacy">
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-tt-title-template">TikTok: Template tiêu đề</label>
              <input id="cfg-tt-title-template" class="input" type="text" value="{title}" aria-label="TikTok title template" />
            </div>
            <div class="config-page__field">
              <label class="config-page__label" for="cfg-tt-privacy">TikTok: Quyền riêng tư</label>
              <select id="cfg-tt-privacy" class="input" aria-label="TikTok privacy">
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
        </div>

      </form>

      <div id="config-save-status" class="config-page__status" aria-live="polite" hidden></div>
    `;
  }

  _attachListeners() {
    this._element.querySelector('#btn-cfg-save')?.addEventListener('click', () => this.save());
    this._element.querySelector('#btn-cfg-reset')?.addEventListener('click', () => this.reset());

    const ttsEngine = this._element.querySelector('#vp-tts-engine');
    ttsEngine?.addEventListener('change', () => this._syncVoiceOptions());

    // Mark dirty on any change
    this._element.querySelector('#config-form')?.addEventListener('change', () => {
      this._dirty = true;
    });
  }

  _syncVoiceOptions() {
    const engineEl = this._element.querySelector('#vp-tts-engine');
    const voiceEl = this._element.querySelector('#vp-tts-voice');
    if (!engineEl || !voiceEl) return;

    const engine = engineEl.value || 'edge-tts';
    const preset = TTS_VOICE_PRESETS[engine] || TTS_VOICE_PRESETS['edge-tts'];
    const current = voiceEl.value;

    voiceEl.innerHTML = preset.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const keep = preset.some(p => p.value === current);
    voiceEl.value = keep ? current : preset[0].value;
  }

  _set(id, val) {
    const el = this._element.querySelector(`#${id}`);
    if (el) el.value = val ?? '';
  }

  _setChk(id, val) {
    const el = this._element.querySelector(`#${id}`);
    if (el) el.checked = !!val;
  }

  _get(id) {
    return this._element.querySelector(`#${id}`)?.value?.trim() || '';
  }

  _getChk(id) {
    return this._element.querySelector(`#${id}`)?.checked ?? false;
  }

  async load() {
    try {
      const cfg = await apiClient.get('/api/config');
      if (!cfg) return;
      this._loadedConfig = cfg;
      this._populateForm(cfg);
      this._dirty = false;
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  _populateForm(cfg) {
    const links = cfg.link || cfg.links || [];
    this._set('cfg-urls', Array.isArray(links) ? links.join('\n') : links);
    this._set('cfg-path', cfg.path || './Downloaded/');
    this._set('cfg-proxy', cfg.proxy || '');
    this._set('cfg-thread', cfg.thread ?? 5);
    this._set('cfg-retry', cfg.retry_times ?? 3);
    this._set('cfg-start', cfg.start_date || '');
    this._set('cfg-end', cfg.end_date || '');

    // Modes
    const modes = cfg.mode || [];
    this._element.querySelectorAll('#mode-checks input[type=checkbox]').forEach(cb => {
      cb.checked = modes.includes(cb.value);
    });

    // Max counts
    const maxCounts = cfg.max_counts || {};
    ['post','like','collect','music','mix','collectmix'].forEach(m => {
      this._set('n-' + m, maxCounts[m] ?? 0);
    });

    this._setChk('opt-music', cfg.music);
    this._setChk('opt-cover', cfg.cover);
    this._setChk('opt-json', cfg.json);
    this._setChk('opt-folder', cfg.folderstyle || cfg.folder);

    // Translation
    const tr = cfg.translation || {};
    this._set('cfg-preferred-provider', tr.preferred_provider || cfg.preferred_provider || 'auto');
    this._set('cfg-deepseek-key', tr.deepseek_key || '');
    this._set('cfg-groq-key', tr.groq_key || '');
    this._set('cfg-groq-model', tr.groq_model || 'llama-3.1-8b-instant');
    this._set('cfg-openai-key', tr.openai_key || '');
    this._set('cfg-hf-token', tr.hf_token || '');
    this._setChk('cfg-naming-enabled', tr.naming_enabled !== false);

    // Upload
    const upload = cfg.upload || {};
    this._set('cfg-upload-platform', upload.platform || 'youtube');
    this._setChk('cfg-upload-auto', upload.auto_upload);
    this._set('cfg-yt-title-template', upload.youtube?.title_template || '{title}');
    this._set('cfg-yt-privacy', upload.youtube?.privacy_status || 'private');
    this._set('cfg-tt-title-template', upload.tiktok?.title_template || '{title}');
    this._set('cfg-tt-privacy', upload.tiktok?.privacy_status || 'private');

    // Video processing
    const vp = cfg.video_process || {};
    this._setChk('vp-enabled', vp.enabled !== false);
    this._set('vp-model', vp.model || 'base');
    this._set('vp-lang', vp.language || 'zh');
    this._set('vp-tts-engine', vp.tts_engine || 'edge-tts');
    this._syncVoiceOptions();
    this._set('vp-tts-voice', vp.tts_voice || 'vi-VN-HoaiMyNeural');
    this._set('vp-font-size', vp.font_size ?? 22);
    this._setChk('vp-burn', vp.burn_subs !== false);
    this._setChk('vp-blur-original', vp.blur_original);
    this._setChk('vp-translate', vp.translate !== false);
    this._setChk('vp-burn-vi', vp.burn_vi_subs !== false);
    this._setChk('vp-voice', vp.voice_convert !== false);
    this._setChk('vp-keep-bg', vp.keep_bg_music || vp.keep_bg);
    this._setChk('vp-auto-speed', vp.auto_speed !== false);

    const afp = vp.anti_fingerprint || {};
    this._setChk('vp-afp-enabled', afp.enabled);
    this._setChk('vp-afp-flip', afp.flip_h);
    this._setChk('vp-afp-vignette', afp.vignette);
    this._setChk('vp-afp-vertical', afp.vertical);
    this._set('vp-afp-brightness', afp.brightness ?? 0.02);
    this._set('vp-afp-contrast', afp.contrast ?? 1.03);
    this._set('vp-afp-scale-w', afp.scale_w ?? 0);
    this._set('vp-afp-scale-h', afp.scale_h ?? 0);
    this._set('vp-afp-overlay-img', afp.overlay_image || '');
  }

  _buildPayload() {
    const modes = [];
    this._element.querySelectorAll('#mode-checks input[type=checkbox]:checked').forEach(cb => modes.push(cb.value));

    const maxCounts = {};
    ['post','like','collect','music','mix','collectmix'].forEach(m => {
      maxCounts[m] = parseInt(this._get('n-' + m)) || 0;
    });

    const urlsRaw = this._get('cfg-urls');
    const links = urlsRaw ? urlsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

    return {
      link: links,
      path: this._get('cfg-path'),
      proxy: this._get('cfg-proxy'),
      thread: parseInt(this._get('cfg-thread')) || 5,
      retry_times: parseInt(this._get('cfg-retry')) || 3,
      start_date: this._get('cfg-start'),
      end_date: this._get('cfg-end'),
      mode: modes,
      max_counts: maxCounts,
      music: this._getChk('opt-music'),
      cover: this._getChk('opt-cover'),
      json: this._getChk('opt-json'),
      folder: this._getChk('opt-folder'),
      translation: {
        preferred_provider: this._get('cfg-preferred-provider'),
        deepseek_key: this._get('cfg-deepseek-key'),
        groq_key: this._get('cfg-groq-key'),
        groq_model: this._get('cfg-groq-model') || 'llama-3.1-8b-instant',
        openai_key: this._get('cfg-openai-key'),
        hf_token: this._get('cfg-hf-token'),
        naming_enabled: this._getChk('cfg-naming-enabled'),
      },
      upload: {
        platform: this._get('cfg-upload-platform') || 'youtube',
        auto_upload: this._getChk('cfg-upload-auto'),
        youtube: {
          title_template: this._get('cfg-yt-title-template') || '{title}',
          privacy_status: this._get('cfg-yt-privacy') || 'private',
        },
        tiktok: {
          title_template: this._get('cfg-tt-title-template') || '{title}',
          privacy_status: this._get('cfg-tt-privacy') || 'private',
        },
      },
      video_process: {
        enabled: this._getChk('vp-enabled'),
        model: this._get('vp-model'),
        language: this._get('vp-lang'),
        tts_engine: this._get('vp-tts-engine'),
        tts_voice: this._get('vp-tts-voice'),
        font_size: parseInt(this._get('vp-font-size')) || 22,
        burn_subs: this._getChk('vp-burn'),
        blur_original: this._getChk('vp-blur-original'),
        translate: this._getChk('vp-translate'),
        burn_vi_subs: this._getChk('vp-burn-vi'),
        voice_convert: this._getChk('vp-voice'),
        keep_bg_music: this._getChk('vp-keep-bg'),
        auto_speed: this._getChk('vp-auto-speed'),
        anti_fingerprint: {
          enabled: this._getChk('vp-afp-enabled'),
          flip_h: this._getChk('vp-afp-flip'),
          vignette: this._getChk('vp-afp-vignette'),
          vertical: this._getChk('vp-afp-vertical'),
          brightness: parseFloat(this._get('vp-afp-brightness')) || 0.02,
          contrast: parseFloat(this._get('vp-afp-contrast')) || 1.03,
          scale_w: parseInt(this._get('vp-afp-scale-w')) || 0,
          scale_h: parseInt(this._get('vp-afp-scale-h')) || 0,
          overlay_image: this._get('vp-afp-overlay-img') || '',
        },
      },
    };
  }

  async save() {
    const btn = this._element.querySelector('#btn-cfg-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

    try {
      await apiClient.post('/api/config', this._buildPayload());
      this._dirty = false;
      this._showStatus('✅ Đã lưu cấu hình', 'success');
    } catch (err) {
      this._showStatus('❌ Lỗi lưu cấu hình: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Lưu cấu hình'; }
    }
  }

  reset() {
    if (this._loadedConfig) {
      this._populateForm(this._loadedConfig);
      this._dirty = false;
      this._showStatus('Đã đặt lại về cấu hình đã lưu', 'info');
    }
  }

  _showStatus(msg, type = 'info') {
    const el = this._element.querySelector('#config-save-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `config-page__status config-page__status--${type}`;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3000);
  }

  mount(parent) {
    if (this._mounted) return;
    parent.appendChild(this._element);
    this._mounted = true;
    this.load();
  }

  unmount() {
    if (!this._mounted) return;
    if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
    this._mounted = false;
  }

  destroy() {
    this.unmount();
    this._element = null;
  }

  get element() { return this._element; }
  get isDirty() { return this._dirty; }
}

export default ConfigPage;
