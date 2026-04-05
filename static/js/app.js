/* ── app.js — Entry point ────────────────────────────────────────────────── */

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const nav  = document.querySelector('.nav-item[data-page="' + name + '"]');
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = t('title_' + name);
  if (name === 'config' && !window._configLoaded) { loadConfig(); window._configLoaded = true; }
  if (name === 'cookies' && !window._cookiesLoaded) { loadCookieMode(); loadCookieFields(); window._cookiesLoaded = true; }
  if (name === 'history') loadHistory();
  if (name === 'download') loadQueue();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

/* ── Video Processing ────────────────────────────────────────────────────── */
window._procMode = localStorage.getItem('proc_mode') || 'ai';
window._procSelectedFile = null;

function setProcessMode(mode) {
  window._procMode = mode === 'model' ? 'model' : 'ai';
  localStorage.setItem('proc_mode', window._procMode);

  const aiPanel = document.getElementById('proc-ai-panel');
  const modelPanel = document.getElementById('proc-model-panel');
  const aiBtn = document.getElementById('proc-tab-ai');
  const modelBtn = document.getElementById('proc-tab-model');
  const isAi = window._procMode === 'ai';

  if (aiPanel) aiPanel.style.display = isAi ? 'block' : 'none';
  if (modelPanel) modelPanel.style.display = isAi ? 'none' : 'block';
  if (aiBtn) {
    aiBtn.classList.toggle('btn-primary', isAi);
    aiBtn.classList.toggle('btn-secondary', !isAi);
  }
  if (modelBtn) {
    modelBtn.classList.toggle('btn-primary', !isAi);
    modelBtn.classList.toggle('btn-secondary', isAi);
  }
}

function _getProcessProvider(kind) {
  const isModel = (window._procMode || 'ai') === 'model';
  const transcribeId = isModel ? 'proc-transcribe-provider-model' : 'proc-transcribe-provider-ai';
  const translateId = isModel ? 'proc-trans-provider-model' : 'proc-trans-provider-ai';
  if (kind === 'transcribe') {
    return document.getElementById(transcribeId)?.value || (isModel ? 'model' : 'groq');
  }
  return document.getElementById(translateId)?.value || 'deepseek';
}

function startProcessVideo() {
  const videoPath = document.getElementById('proc-video')?.value?.trim();
  const videoUrl = document.getElementById('proc-url')?.value?.trim();
  const selectedFile = window._procSelectedFile || document.getElementById('proc-file')?.files?.[0] || null;
  if (!videoPath && !videoUrl) { alert('Vui lòng nhập đường dẫn file video hoặc URL video'); return; }

  const btn = document.getElementById('btn-proc');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

  // Reset UI
  const logBox = document.getElementById('proc-log');
  if (logBox) logBox.innerHTML = '';
  _setProcProgress(0, 'Bắt đầu...');

  const baseFields = {
    video_path:       videoPath,
    video_url:        videoUrl || '',
    out_dir:          document.getElementById('proc-out')?.value?.trim() || '',
    model:            document.getElementById('proc-model')?.value || 'base',
    language:         document.getElementById('proc-lang')?.value || 'zh',
    burn_subs:        document.getElementById('proc-burn')?.checked ?? true,
    blur_original:    document.getElementById('proc-blur')?.checked ?? true,
    blur_zone:        document.getElementById('proc-blur-zone')?.value || 'bottom',
    blur_height_pct:  parseFloat(document.getElementById('proc-blur-height')?.value || '15') / 100,
    font_size:        parseInt(document.getElementById('proc-font-size')?.value || '18'),
    font_color:       document.getElementById('proc-font-color')?.value || 'white',
    margin_v:         parseInt(document.getElementById('proc-margin-v')?.value || '30'),
    subtitle_position: document.getElementById('proc-sub-pos')?.value || 'bottom',
    translate_subs:   document.getElementById('proc-translate-subs')?.checked ?? false,
    burn_vi_subs:     document.getElementById('proc-burn-vi')?.checked ?? false,
    transcribe_provider: _getProcessProvider('transcribe'),
    translate_provider: _getProcessProvider('translate'),
    voice_convert:    document.getElementById('proc-voice')?.checked ?? false,
    tts_engine:       document.getElementById('proc-tts-engine')?.value || 'edge-tts',
    tts_voice:        document.getElementById('proc-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
    keep_bg_music:    document.getElementById('proc-keep-bg')?.checked ?? true,
    bg_volume:        parseFloat(document.getElementById('proc-bg-vol')?.value || '0.15'),
    process_mode:     window._procMode || 'ai',
  };

  const doRequest = (body, isFormData) => fetch('/api/process_video', {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body,
  }).then(res => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          if (btn) { btn.disabled = false; btn.textContent = 'Xử lý Video'; }
          return;
        }
        const text = decoder.decode(value, { stream: true });
        text.split('\n').filter(l => l.trim()).forEach(line => {
          try {
            const d = JSON.parse(line);
            if (d.log)         _appendProcLog(d.log, d.level || 'info');
            if (d.overall !== undefined) _setProcProgress(d.overall, d.overall_lbl || '');
          } catch {}
        });
        read();
      });
    }
    read();
  }).catch(err => {
    _appendProcLog('Lỗi kết nối: ' + err, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Xử lý Video'; }
  });

  if (selectedFile) {
    const form = new FormData();
    form.append('video_file', selectedFile);
    Object.entries(baseFields).forEach(([key, value]) => form.append(key, String(value ?? '')));
    doRequest(form, true);
    return;
  }

  doRequest(JSON.stringify(baseFields), false);
}

function _appendProcLog(msg, level) {
  const box = document.getElementById('proc-log');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'log-line log-' + (level || 'info');
  div.textContent = msg;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function _setProcProgress(pct, label) {
  const bar = document.getElementById('pb-proc-overall');
  const pctEl = document.getElementById('pb-proc-overall-pct');
  const lblEl = document.getElementById('lbl-proc-overall');
  if (bar)   bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (lblEl) lblEl.textContent = label || '';
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  switchPage('user');
  document.getElementById('manual-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addManualUrl();
  });
  _initUserPageListeners();

  document.getElementById('proc-file')?.addEventListener('change', function() {
    const file = this.files && this.files[0] ? this.files[0] : null;
    window._procSelectedFile = file;
    const pathBox = document.getElementById('proc-video');
    const label = document.getElementById('proc-file-name');
    if (pathBox) pathBox.value = file ? file.name : '';
    if (label) label.textContent = file ? file.name : '--';
  });

  setProcessMode(window._procMode || 'ai');

  // Toggle voice options visibility
  document.getElementById('proc-voice')?.addEventListener('change', function() {
    const opts = document.getElementById('proc-voice-opts');
    if (opts) opts.style.display = this.checked ? 'block' : 'none';
  });
});
