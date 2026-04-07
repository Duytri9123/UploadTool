/* ── app.js — Entry point ────────────────────────────────────────────────── */

window._trSelectedFile = null;

const TTS_VOICE_PRESETS = {
  'fpt-ai': [
    { value: 'banmai', label: 'Ban Mai — Nữ miền Bắc (FPT)' },
    { value: 'thuminh', label: 'Thu Minh — Nữ miền Nam (FPT)' },
    { value: 'myan', label: 'Mỹ An — Nữ miền Trung (FPT)' },
    { value: 'leminh', label: 'Lê Minh — Nam miền Bắc (FPT)' },
  ],
  'openai-tts': [
    { value: 'alloy', label: 'Alloy — Trung tính (OpenAI)' },
    { value: 'echo', label: 'Echo — Nam (OpenAI)' },
    { value: 'fable', label: 'Fable — Nam (OpenAI)' },
    { value: 'onyx', label: 'Onyx — Nam trầm (OpenAI)' },
    { value: 'nova', label: 'Nova — Nữ (OpenAI)' },
    { value: 'shimmer', label: 'Shimmer — Nữ nhẹ (OpenAI)' },
  ],
  'edge-tts': [
    { value: 'vi-VN-HoaiMyNeural', label: 'Hoài My — Nữ (Edge)' },
    { value: 'vi-VN-NamMinhNeural', label: 'Nam Minh — Nam (Edge)' },
  ],
  gtts: [
    { value: 'vi', label: 'Vietnamese (gTTS)' },
  ],
};

const TTS_DEFAULT_VOICE = {
  'fpt-ai': 'banmai',
  'openai-tts': 'nova',
  'edge-tts': 'vi-VN-HoaiMyNeural',
  gtts: 'vi',
};

function _syncVoiceOptions(engineSelectId, voiceSelectId) {
  const engineEl = document.getElementById(engineSelectId);
  const voiceEl = document.getElementById(voiceSelectId);
  if (!engineEl || !voiceEl) return;

  const engine = (engineEl.value || 'fpt-ai').toLowerCase();
  const preset = TTS_VOICE_PRESETS[engine] || TTS_VOICE_PRESETS['fpt-ai'];
  const current = voiceEl.value || '';

  voiceEl.innerHTML = '';
  preset.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    voiceEl.appendChild(opt);
  });

  const keep = preset.some(item => item.value === current);
  voiceEl.value = keep ? current : (TTS_DEFAULT_VOICE[engine] || preset[0].value);
}

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
  if (name === 'process') loadQueue();
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
    burn_subs:        document.getElementById('proc-burn')?.checked ?? true,
    blur_original:    document.getElementById('proc-blur-original')?.checked ?? true,
    translate_subs:   document.getElementById('proc-translate-subs')?.checked ?? true,
    burn_vi_subs:     document.getElementById('proc-burn-vi')?.checked ?? true,
    voice_convert:    document.getElementById('proc-voice')?.checked ?? false,
    keep_bg_music:    document.getElementById('proc-keep-bg')?.checked ?? false,
    font_size:        parseInt(document.getElementById('proc-font-size')?.value || '32', 10),
    subtitle_position: document.getElementById('proc-sub-pos')?.value || 'bottom',
    margin_v:         parseInt(document.getElementById('proc-margin-v')?.value || '20', 10),
    tts_engine:       document.getElementById('proc-tts-engine')?.value || 'fpt-ai',
    tts_voice:        document.getElementById('proc-tts-voice')?.value || 'banmai',
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
          // Auto-publish after processing - no confirm
          if (window._publishLastOutputPath && document.getElementById('publish-auto-upload')?.checked) {
            publishSelectedPlatform();
          }
          return;
        }
        const text = decoder.decode(value, { stream: true });
        text.split('\n').filter(l => l.trim()).forEach(line => {
          try {
            const d = JSON.parse(line);
            if (d.log) {
              _appendProcLog(d.log, d.level || 'info');
              // Capture final output file path
              if (d.log.includes('File cuối cùng:') || d.log.includes('final_output_path')) {
                const match = d.log.match(/[:\s]([^\s]+\.mp4)/);
                if (match) {
                  window._publishLastOutputPath = match[1];
                  window._ytLastOutputPath = match[1];
                }
              }
            }
            if (d.file_path) {
              window._publishLastOutputPath = d.file_path;
              window._ytLastOutputPath = d.file_path;
            }
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
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8); // HH:MM:SS
  div.textContent = `[${ts}] ${msg}`;
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

/* ── Transcribe page ─────────────────────────────────────────────────────── */
window._trPreviewObjectUrl = null;
window._trAssPreviewText = '';

function _extractPreviewTextFromAss(content, maxLines = 2) {
  if (!content) return '';
  const lines = String(content).split(/\r?\n/);
  const texts = [];
  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue;
    const payload = line.slice('Dialogue:'.length).trim();
    const parts = payload.split(',', 10);
    if (parts.length < 10) continue;
    let text = parts[9] || '';
    text = text.replace(/\{[^}]*\}/g, '');
    text = text.replace(/\\N/g, ' ').replace(/\\n/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    texts.push(text);
    if (texts.length >= maxLines) break;
  }
  return texts.join(' ');
}

function startTranscribe() {
  const folder = document.getElementById('tr-dir')?.value?.trim() || './Downloaded';
  const single = document.getElementById('tr-file')?.value?.trim() || '';
  const outDir = document.getElementById('tr-out')?.value?.trim() || '';
  const selectedFile = window._trSelectedFile || document.getElementById('tr-import-file')?.files?.[0] || null;
  if (!folder && !single && !selectedFile) {
    alert('Vui lòng nhập thư mục video hoặc file đơn.');
    return;
  }

  const btn = document.getElementById('btn-tr');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang phiên âm...';
  }

  clearLog('tr-log');
  _setTrProgress(0, '--', 0, '--');

  const payload = {
    folder,
    single,
    out_dir: outDir,
    model: document.getElementById('tr-model')?.value || 'base',
    lang: document.getElementById('tr-lang')?.value || 'zh',
    srt: document.getElementById('tr-srt')?.checked ?? false,
    skip: document.getElementById('tr-skip')?.checked ?? true,
    sc: document.getElementById('tr-sc')?.checked ?? false,
  };

  const runRequest = (body, isFormData) => fetch('/api/transcribe', {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body,
  }).then(res => {
    if (!res.ok || !res.body) {
      throw new Error('Không thể bắt đầu phiên âm');
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          if (buffer.trim()) _handleTrLine(buffer.trim());
          if (btn) {
            btn.disabled = false;
            btn.textContent = t('btn_start_tr');
          }
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed) _handleTrLine(trimmed);
        });
        read();
      }).catch(err => {
        _appendTrLog('Lỗi đọc dữ liệu: ' + err, 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = t('btn_start_tr');
        }
      });
    }

    read();
  }).catch(err => {
    _appendTrLog('Lỗi kết nối: ' + err, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = t('btn_start_tr');
    }
  });

  if (selectedFile) {
    const form = new FormData();
    form.append('video_file', selectedFile);
    Object.entries(payload).forEach(([key, value]) => form.append(key, String(value ?? '')));
    runRequest(form, true);
    return;
  }

  runRequest(JSON.stringify(payload), false);
}

function _handleTrLine(line) {
  try {
    const d = JSON.parse(line);
    if (d.log) _appendTrLog(d.log, d.level || 'info');
    if (d.overall !== undefined || d.file !== undefined) {
      _setTrProgress(d.overall ?? 0, d.overall_lbl || '--', d.file ?? 0, d.file_lbl || '--');
    }
    if ((d.overall ?? 0) >= 100) {
      toast(t('toast_tr_done'), 'success');
    }
  } catch (_) {
    _appendTrLog(line, 'info');
  }
}

function _appendTrLog(msg, level) {
  appendLog('tr-log', msg, level || 'info');
}

function _setTrProgress(overallPct, overallLbl, filePct, fileLbl) {
  setProgress('pb-tr-overall', 'lbl-tr-overall', Number(overallPct) || 0, overallLbl || '--');
  setProgress('pb-tr-file', 'lbl-tr-file', Number(filePct) || 0, fileLbl || '--');
}

async function previewTranscribeVoice() {
  const textInput = document.getElementById('tr-preview-text');
  let text = textInput?.value?.trim() || '';
  if (!text && window._trAssPreviewText) {
    text = window._trAssPreviewText;
    if (textInput) textInput.value = text;
  }
  if (!text) {
    alert('Vui lòng nhập nội dung để nghe thử giọng.');
    return;
  }

  const btn = document.getElementById('btn-tr-preview');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang tạo giọng...';
  }

  try {
    const res = await fetch('/api/tts_preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        tts_engine: document.getElementById('tr-tts-engine')?.value || 'edge-tts',
        tts_voice: document.getElementById('tr-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
      }),
    });

    if (!res.ok) {
      let errorText = 'Không thể tạo audio preview';
      try {
        const errJson = await res.json();
        if (errJson?.error) errorText = errJson.error;
      } catch (_) {}
      throw new Error(errorText);
    }

    const blob = await res.blob();
    const audio = document.getElementById('tr-preview-audio');
    if (!audio) return;

    if (window._trPreviewObjectUrl) {
      URL.revokeObjectURL(window._trPreviewObjectUrl);
      window._trPreviewObjectUrl = null;
    }

    window._trPreviewObjectUrl = URL.createObjectURL(blob);
    audio.src = window._trPreviewObjectUrl;
    audio.style.display = 'block';
    try { await audio.play(); } catch (_) {}
  } catch (err) {
    alert('Lỗi preview giọng: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Nghe thử';
    }
  }
}

async function previewProcVoice() {
  const text = document.getElementById('proc-preview-text')?.value?.trim()
    || 'Xin chào, đây là giọng đọc tiếng Việt.';
  const btn = document.getElementById('btn-proc-preview');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo...'; }
  try {
    const res = await fetch('/api/tts_preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        tts_engine: document.getElementById('proc-tts-engine')?.value || 'edge-tts',
        tts_voice:  document.getElementById('proc-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
        pitch_semitones: parseFloat(document.getElementById('proc-tts-pitch')?.value || '0'),
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Lỗi'); }
    const blob = await res.blob();
    const audio = document.getElementById('proc-preview-audio');
    if (audio) {
      if (audio._objUrl) URL.revokeObjectURL(audio._objUrl);
      audio._objUrl = URL.createObjectURL(blob);
      audio.src = audio._objUrl;
      audio.style.display = 'block';
      audio.play().catch(() => {});
    }
  } catch (e) {
    toast('Lỗi nghe thử: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Nghe thử'; }
  }
}

/* ── Multi-file publish queue ────────────────────────────────────────────── */
window._procFileQueue = []; // [{file, name, path}]

function handlePublishFileInput(input) {
  const files = input.files ? Array.from(input.files) : [];
  files.forEach(f => _procFileQueueAdd(f));
  input.value = '';
}

function _procFileQueueAdd(fileOrPath) {
  const isFile = typeof File !== 'undefined' && fileOrPath instanceof File;
  const name = isFile ? fileOrPath.name : String(fileOrPath).split(/[\\/]/).pop();
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  window._procFileQueue.push({ id, file: isFile ? fileOrPath : null, path: isFile ? null : String(fileOrPath), name });
  _renderProcFileList();
}

function _procFileQueueRemove(id) {
  window._procFileQueue = window._procFileQueue.filter(f => f.id !== id);
  _renderProcFileList();
}

function _renderProcFileList() {
  const list = document.getElementById('proc-file-list');
  if (!list) return;
  if (!window._procFileQueue.length) { list.style.display = 'none'; return; }
  list.style.display = 'flex';
  list.innerHTML = window._procFileQueue.map(f => `
    <div id="pfl-${f.id}" style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--surf2,#2a2a3e);border-radius:6px;font-size:12px">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</span>
      <span id="pfl-status-${f.id}" style="color:var(--dim,#888);font-size:11px;min-width:60px;text-align:right"></span>
      <button onclick="_procFileQueueRemove('${f.id}')" style="background:none;border:none;color:#ff5555;cursor:pointer;font-size:14px;padding:0 2px">✕</button>
    </div>`).join('');
}

async function publishQueueToTarget(target) {
  if (!window._procFileQueue.length) {
    toast('Chưa có file nào trong danh sách', 'warning');
    return;
  }
  const logBox = document.getElementById('publish-log');
  if (logBox) { logBox.innerHTML = ''; logBox.style.display = 'block'; }

  const queue = [...window._procFileQueue];
  for (const item of queue) {
    const statusEl = document.getElementById(`pfl-status-${item.id}`);
    if (statusEl) statusEl.textContent = '⏳ Đang đăng...';

    try {
      if (target === 'tiktok' || target === 'both') {
        window._publishLastOutputPath = item.path || item.name;
        window._procSelectedFile = item.file;
        await publishToTikTok(item.path || item.file);
      }
      if (target === 'youtube' || target === 'both') {
        window._publishLastOutputPath = item.path || item.name;
        window._ytLastOutputPath = item.path || item.name;
        window._procSelectedFile = item.file;
        await uploadToYouTube(item.path || item.file);
      }
      if (statusEl) statusEl.textContent = '✓ Xong';
      // Remove from queue after success
      _procFileQueueRemove(item.id);
    } catch (e) {
      if (statusEl) statusEl.textContent = '✗ Lỗi';
      _appendPublishLog(`✗ ${item.name}: ${e.message || e}`, 'error');
    }
  }
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
    this.value = '';
  });

  document.getElementById('proc-tts-engine')?.addEventListener('change', function() {
    _syncVoiceOptions('proc-tts-engine', 'proc-tts-voice');
  });
  _syncVoiceOptions('proc-tts-engine', 'proc-tts-voice');

  document.getElementById('vp-tts-engine')?.addEventListener('change', function() {
    _syncVoiceOptions('vp-tts-engine', 'vp-tts-voice');
  });
  _syncVoiceOptions('vp-tts-engine', 'vp-tts-voice');

  document.getElementById('tr-import-file')?.addEventListener('change', function() {
    const file = this.files && this.files[0] ? this.files[0] : null;
    window._trSelectedFile = file;
    window._trAssPreviewText = '';
    const singleInput = document.getElementById('tr-file');
    const nameLabel = document.getElementById('tr-file-name');
    const previewInput = document.getElementById('tr-preview-text');
    if (singleInput && file) {
      singleInput.value = '';
      singleInput.placeholder = file.name;
    }
    if (nameLabel) nameLabel.textContent = file ? file.name : '--';

    if (previewInput && file && String(file.name || '').toLowerCase().endsWith('.ass')) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const extracted = _extractPreviewTextFromAss(content, 2);
        if (extracted) {
          window._trAssPreviewText = extracted;
          previewInput.value = extracted;
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  });

  document.getElementById('tr-tts-engine')?.addEventListener('change', function() {
    _syncVoiceOptions('tr-tts-engine', 'tr-tts-voice');
  });
  _syncVoiceOptions('tr-tts-engine', 'tr-tts-voice');

  setProcessMode(window._procMode || 'ai');

  // Toggle voice options visibility
  document.getElementById('proc-voice')?.addEventListener('change', function() {
    const opts = document.getElementById('proc-voice-opts');
    if (opts) opts.style.display = this.checked ? 'block' : 'none';
  });

  const previewInput = document.getElementById('tr-preview-text');
  if (previewInput && !previewInput.value) {
    previewInput.value = 'Xin chào, đây là phần nghe thử giọng tiếng Việt.';
  }

  // Publish integration
  loadPublishSettings();
  checkYouTubeAuth();
  checkTikTokAuth();
  document.getElementById('publish-platform')?.addEventListener('change', function() {
    switchPublishPlatform(this.value || 'youtube');
  });
  document.getElementById('publish-auto-upload')?.addEventListener('change', function() {
    const status = document.getElementById('publish-status');
    if (status) status.textContent = this.checked ? 'Tự động bật' : 'Tự động tắt';
  });
  switchPublishPlatform(localStorage.getItem('publish_platform') || 'youtube');

  // ── Anti-Fingerprint handlers ──────────────────────────────────────────
  const _uploadAntiFingerprintFile = async (file, pathId, previewId) => {
    if (!file) return;
    const pathEl = document.getElementById(pathId);
    const previewEl = document.getElementById(previewId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
        return;
      }
      if (pathEl) pathEl.value = data.path;
      if (previewEl) previewEl.textContent = file.name;
      await _saveAntiFingerprintConfig();
    } catch (err) {
      console.error('anti-fingerprint upload error:', err);
      alert('Upload error: ' + (err.message || err));
    }
  };

  document.getElementById('overlay-image-file')?.addEventListener('change', async (e) => {
    await _uploadAntiFingerprintFile(e.target.files?.[0], 'overlay-image-path', 'overlay-image-preview');
  });

  document.getElementById('logo-image-file')?.addEventListener('change', async (e) => {
    await _uploadAntiFingerprintFile(e.target.files?.[0], 'logo-image-path', 'logo-image-preview');
  });

  document.getElementById('cfg-overlay-image-file')?.addEventListener('change', async (e) => {
    await _uploadAntiFingerprintFile(e.target.files?.[0], 'cfg-overlay-image-path', 'cfg-overlay-image-path');
  });

  document.getElementById('cfg-logo-image-file')?.addEventListener('change', async (e) => {
    await _uploadAntiFingerprintFile(e.target.files?.[0], 'cfg-logo-image-path', 'cfg-logo-image-path');
  });

  ['anti-fingerprint-enabled', 'overlay-opacity', 'logo-enabled', 'logo-position'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => _saveAntiFingerprintConfig());
  });
});

/* ── Publish Upload ─────────────────────────────────────────────────────── */
window._publishLastOutputPath = null;
window._ytAuthenticated = false;
window._ttAuthenticated = false;
window._publishPlatform = localStorage.getItem('publish_platform') || 'youtube';

function loadPublishSettings() {
  const platform = localStorage.getItem('publish_platform') || 'youtube';
  const autoUpload = localStorage.getItem('publish_auto_upload') === 'true';
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== null && val !== undefined) el.value = val; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  setVal('publish-platform', platform);
  setChk('publish-auto-upload', autoUpload);

  // Use config defaults when present, but allow local edits to stay in place.
  API.get('/api/config').then(cfg => {
    const upload = cfg?.upload || {};
    if (upload.platform && !localStorage.getItem('publish_platform')) {
      setVal('publish-platform', upload.platform);
      switchPublishPlatform(upload.platform);
    }
    if (upload.auto_upload !== undefined && localStorage.getItem('publish_auto_upload') === null) {
      setChk('publish-auto-upload', upload.auto_upload);
    }
    setVal('yt-title', upload.youtube?.title_template || document.getElementById('yt-title')?.value || '');
    setVal('yt-desc', upload.youtube?.description_template || document.getElementById('yt-desc')?.value || '');
    setVal('yt-privacy', upload.youtube?.privacy_status || document.getElementById('yt-privacy')?.value || 'private');
    setVal('tt-title', upload.tiktok?.title_template || document.getElementById('tt-title')?.value || '');
    setVal('tt-desc', upload.tiktok?.caption_template || document.getElementById('tt-desc')?.value || '');
    setVal('tt-privacy', upload.tiktok?.privacy_status || document.getElementById('tt-privacy')?.value || 'public');
  }).catch(() => {});
}

function switchPublishPlatform(platform) {
  const normalized = platform === 'tiktok' ? 'tiktok' : platform === 'both' ? 'both' : 'youtube';
  window._publishPlatform = normalized;
  localStorage.setItem('publish_platform', normalized);

  const ytPanel = document.getElementById('publish-youtube-panel');
  const ttPanel = document.getElementById('publish-tiktok-panel');
  const status = document.getElementById('publish-status');
  const platformSelect = document.getElementById('publish-platform');

  if (platformSelect && platformSelect.value !== normalized) platformSelect.value = normalized;
  if (ytPanel) ytPanel.style.display = (normalized === 'youtube' || normalized === 'both') ? 'block' : 'none';
  if (ttPanel) ttPanel.style.display = (normalized === 'tiktok' || normalized === 'both') ? 'block' : 'none';
  if (status) status.textContent = normalized === 'youtube' ? 'YouTube' : normalized === 'tiktok' ? 'TikTok' : 'TikTok + YouTube';
}

function _getPublishAutoUpload() {
  return document.getElementById('publish-auto-upload')?.checked || false;
}

function _renderPublishTemplate(template, values) {
  const source = String(template || '').trim();
  if (!source) return '';
  return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = values && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : '';
    return value === null || value === undefined ? '' : String(value);
  }).trim();
}

function _cleanStemToTitle(stem) {
  // Remove extension
  let t = stem.replace(/\.[^/.]+$/, '');
  // Remove trailing _vi_voice, _voice, _vi suffixes
  t = t.replace(/_(vi_voice|voice|vi)$/i, '');
  // Remove date prefix like 2024-01-15_
  t = t.replace(/^\d{4}-\d{2}-\d{2}_/, '');
  // Remove aweme_id suffix (long numeric id at end)
  t = t.replace(/_\d{15,}$/, '');
  // Split off Chinese characters into separate part
  const chineseMatch = t.match(/[\u4e00-\u9fff\u3400-\u4dbf][^\u0000-\u007F_]*/g);
  // Remove Chinese segments from title
  t = t.replace(/[\u4e00-\u9fff\u3400-\u4dbf][^\u0000-\u007F]*/g, '').replace(/_+/g, ' ').trim();
  return { title: t, chineseParts: chineseMatch || [] };
}

async function _buildPublishTitleAndTags(platform, fallbackPath) {
  const stem = (fallbackPath || '').split(/[\\/]/).pop() || '';
  const inputId = platform === 'tiktok' ? 'tt-title' : 'yt-title';
  const raw = (document.getElementById(inputId)?.value || '').trim();
  const { title: baseTitle, chineseParts } = _cleanStemToTitle(stem);

  const finalTitle = _renderPublishTemplate(raw || '{title}', {
    title: baseTitle, filename: stem, platform,
  }) || baseTitle;

  // Translate Chinese parts to hashtags
  let hashtags = [];
  if (chineseParts.length > 0) {
    try {
      const res = await fetch('/api/translate_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: chineseParts }),
      });
      const data = await res.json();
      hashtags = (data.results || chineseParts).map(s =>
        '#' + s.trim().toLowerCase().replace(/\s+/g, '')
      ).filter(h => h.length > 1);
    } catch (_) {
      // fallback: use Chinese as-is
      hashtags = chineseParts.map(s => '#' + s.trim().replace(/\s+/g, ''));
    }
  }

  return { title: finalTitle, hashtags };
}

function _getPublishTitle(platform, fallbackPath) {
  const stem = (fallbackPath || '').split(/[\\/]/).pop() || '';
  const inputId = platform === 'tiktok' ? 'tt-title' : 'yt-title';
  const raw = (document.getElementById(inputId)?.value || '').trim();
  const { title: baseTitle } = _cleanStemToTitle(stem);
  return _renderPublishTemplate(raw || '{title}', {
    title: baseTitle, filename: stem, platform,
  }) || baseTitle;
}

function _getPublishDescription(platform) {
  const inputId = platform === 'tiktok' ? 'tt-desc' : 'yt-desc';
  const raw = (document.getElementById(inputId)?.value || '').trim();
  const baseTitle = _getPublishTitle(platform, window._publishLastOutputPath || window._ytLastOutputPath || '');
  return _renderPublishTemplate(raw || '{title}', {
    title: baseTitle,
    filename: (window._publishLastOutputPath || window._ytLastOutputPath || '').split(/[\\/]/).pop() || baseTitle,
    platform,
  });
}

function _getPublishPrivacy(platform) {
  const inputId = platform === 'tiktok' ? 'tt-privacy' : 'yt-privacy';
  return (document.getElementById(inputId)?.value || (platform === 'tiktok' ? 'public' : 'private')).trim();
}

function _getPublishTags() {
  return (document.getElementById('tt-tags')?.value || '').trim();
}

function _appendPublishLog(msg, level) {
  const box = document.getElementById('publish-log');
  if (!box) return;
  box.style.display = 'block';
  const line = document.createElement('div');
  line.className = 'log-' + (level || 'info');
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  line.textContent = `[${ts}] ${msg}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function _setPublishStatus(text) {
  const status = document.getElementById('publish-status');
  if (status) status.textContent = text;
}

function _toYouTubeUserHint(err) {
  const raw = String(err?.message || err || '').trim();
  const low = raw.toLowerCase();

  if (low.includes('client_secrets.json not found')) {
    return 'Thiếu file client_secrets.json ở thư mục gốc dự án.';
  }
  if (low.includes('redirect_uri_mismatch')) {
    return 'Sai Redirect URI trên Google Cloud. Cần thêm: http://localhost:8080/oauth2callback';
  }
  if (low.includes('access blocked') || low.includes('app isn\'t verified')) {
    return 'Ứng dụng OAuth đang bị chặn/chưa verify. Hãy thêm tài khoản vào Test users trong Google Cloud.';
  }
  if (low.includes('missing dependency') || low.includes('no module named')) {
    return 'Thiếu thư viện YouTube OAuth. Chạy: pip install -r requirements.txt';
  }
  if (low.includes('server trả về dữ liệu không phải json')) {
    return 'Backend đang lỗi nội bộ hoặc chưa chạy đúng cổng. Kiểm tra log app.py.';
  }
  return raw || 'Không thể kết nối YouTube. Kiểm tra cấu hình OAuth và thử lại.';
}

function _showYouTubeError(err, prefix) {
  const hint = _toYouTubeUserHint(err);
  const pfx = prefix || 'Lỗi kết nối YouTube';
  toast(pfx + ': ' + hint, 'error');
  _appendPublishLog(pfx + ': ' + hint, 'error');
  const status = document.getElementById('yt-status');
  if (status) status.textContent = 'Lỗi kết nối';
}

async function checkYouTubeAuth() {
  try {
    const res = await API.get('/api/youtube_auth');
    if (res?.authenticated) {
      _setYouTubeAuthenticated(true, res.channel);
    } else {
      _setYouTubeAuthenticated(false, null);
    }
  } catch (e) {
    console.warn('YouTube auth check failed:', e);
    _showYouTubeError(e, 'Không kiểm tra được trạng thái YouTube');
  }
}

function _setYouTubeAuthenticated(authenticated, channel) {
  window._ytAuthenticated = authenticated;
  const authBtn = document.getElementById('btn-yt-auth');
  const logoutBtn = document.getElementById('btn-yt-logout');
  const channelInfo = document.getElementById('yt-channel-info');
  const authNeeded = document.getElementById('yt-auth-needed');
  const status = document.getElementById('yt-status');

  if (authenticated && channel) {
    if (authBtn) authBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (channelInfo) {
      channelInfo.style.display = 'block';
      document.getElementById('yt-ch-name').textContent = channel.title || '--';
      document.getElementById('yt-ch-subs').textContent = channel.subscribers || 'Ẩn';
      document.getElementById('yt-ch-videos').textContent = channel.video_count || '0';
    }
    if (authNeeded) authNeeded.style.display = 'none';
    if (status) status.textContent = '✓ Đã kết nối';
  } else {
    if (authBtn) authBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (channelInfo) channelInfo.style.display = 'none';
    if (authNeeded) authNeeded.style.display = 'none';
    if (status) status.textContent = 'Chưa kết nối';
  }
}

async function youtubeLogin() {
  const btn = document.getElementById('btn-yt-auth');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang kết nối...';
  }

  try {
    const res = await API.post('/api/youtube_auth', {});
    if (res?.authenticated) {
      _setYouTubeAuthenticated(true, res.channel);
      toast('Đã kết nối với YouTube', 'success');
    } else if (res?.auth_url) {
      toast('Vui lòng mở link để đăng nhập YouTube', 'info');
      const popup = window.open(res.auth_url, 'youtube_auth', 'width=680,height=720');
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        await checkYouTubeAuth();
        if (window._ytAuthenticated || (popup && popup.closed) || tries >= 60) {
          clearInterval(timer);
        }
      }, 2000);
    }
  } catch (e) {
    _showYouTubeError(e, 'Lỗi kết nối YouTube');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Đăng nhập YouTube';
    }
  }
}

async function youtubeLogout() {
  if (!confirm('Xác nhận đăng xuất YouTube?')) return;
  
  try {
    await API.post('/api/youtube_logout', {});
    _setYouTubeAuthenticated(false, null);
    toast('Đã đăng xuất YouTube', 'info');
  } catch (e) {
    toast('Lỗi đăng xuất: ' + e.message, 'error');
  }
}

function _toTikTokUserHint(err) {
  const raw = String(err?.message || err || '').trim();
  const low = raw.toLowerCase();

  if (low.includes('missing tiktok client_key/client_secret')) {
    return 'Thiếu TikTok client_key/client_secret trong cấu hình upload.tiktok.';
  }
  if (low.includes('oauth') || low.includes('auth')) {
    return raw || 'Không thể xác thực TikTok. Kiểm tra Client Key/Secret và Redirect URI.';
  }
  return raw || 'Không thể kết nối TikTok API. Kiểm tra cấu hình và thử lại.';
}

function _showTikTokError(err, prefix) {
  const hint = _toTikTokUserHint(err);
  const pfx = prefix || 'Lỗi kết nối TikTok';
  toast(pfx + ': ' + hint, 'error');
  _appendPublishLog(pfx + ': ' + hint, 'error');
  const status = document.getElementById('publish-status');
  if (status && (window._publishPlatform || '') === 'tiktok') status.textContent = 'Lỗi TikTok';
}

function _setTikTokAuthenticated(authenticated, account) {
  window._ttAuthenticated = !!authenticated;
  const authBtn = document.getElementById('btn-tt-auth');
  const logoutBtn = document.getElementById('btn-tt-logout');
  const accountInfo = document.getElementById('tt-account-info');
  const authNeeded = document.getElementById('tt-auth-needed');

  if (window._ttAuthenticated) {
    if (authBtn) authBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (accountInfo) {
      accountInfo.style.display = 'block';
      const openid = document.getElementById('tt-account-openid');
      const scope = document.getElementById('tt-account-scope');
      if (openid) openid.textContent = account?.open_id || '--';
      if (scope) scope.textContent = account?.scope || '--';
    }
    if (authNeeded) authNeeded.style.display = 'none';
  } else {
    if (authBtn) authBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (accountInfo) accountInfo.style.display = 'none';
    if (authNeeded) authNeeded.style.display = 'block';
  }
}

async function checkTikTokAuth() {
  try {
    const res = await API.get('/api/tiktok_auth');
    if (res?.authenticated) {
      _setTikTokAuthenticated(true, res.account || {});
    } else {
      _setTikTokAuthenticated(false, null);
    }
  } catch (e) {
    console.warn('TikTok auth check failed:', e);
    _setTikTokAuthenticated(false, null);
  }
}

async function tiktokLogin() {
  const btn = document.getElementById('btn-tt-auth');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang kết nối...';
  }

  try {
    const res = await API.post('/api/tiktok_auth', {});
    if (res?.authenticated) {
      _setTikTokAuthenticated(true, res.account || {});
      toast('Đã kết nối TikTok', 'success');
    } else if (res?.auth_url) {
      toast('Vui lòng mở link để đăng nhập TikTok', 'info');
      const popup = window.open(res.auth_url, 'tiktok_auth', 'width=680,height=720');
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        await checkTikTokAuth();
        if (window._ttAuthenticated || (popup && popup.closed) || tries >= 60) {
          clearInterval(timer);
        }
      }, 2000);
    }
  } catch (e) {
    _showTikTokError(e, 'Lỗi kết nối TikTok');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Đăng nhập TikTok';
    }
  }
}

async function tiktokLogout() {
  if (!confirm('Xác nhận đăng xuất TikTok?')) return;

  try {
    await API.post('/api/tiktok_logout', {});
    _setTikTokAuthenticated(false, null);
    toast('Đã đăng xuất TikTok', 'info');
  } catch (e) {
    _showTikTokError(e, 'Lỗi đăng xuất TikTok');
  }
}

async function _publishToYouTubeManual(videoInput) {
  const videoPath = typeof videoInput === 'string' ? videoInput.trim() : (videoInput?.name || '').trim();
  const title = _getPublishTitle('youtube', videoPath);
  const description = _getPublishDescription('youtube');
  const tags = ['douyin', 'tiktok', 'video'].join(', ');

  try {
    const clip = [
      `Title: ${title}`,
      description ? `Description:\n${description}` : '',
      `Tags: ${tags}`,
    ].filter(Boolean).join('\n\n');
    if (clip && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(clip);
    }
  } catch (_) {}

  _setPublishStatus('Đăng YouTube thủ công');
  _appendPublishLog('Chuyển sang chế độ đăng YouTube thủ công (không dùng OAuth API).', 'warning');
  _appendPublishLog('Đã sao chép title/description/tags vào clipboard.', 'info');
  if (videoPath) {
    _appendPublishLog(`File cần đăng: ${videoPath}`, 'info');
  }
  _appendPublishLog('Đang mở trang upload YouTube...', 'info');
  _appendPublishLog('Bước tiếp theo: chọn file video, dán mô tả đã copy (Ctrl+V), rồi bấm Publish.', 'info');
  toast('Đã chuyển sang đăng thủ công. Dữ liệu đã copy clipboard.', 'info');
  window.open('https://www.youtube.com/upload', '_blank');
}

async function uploadToYouTube(videoInput) {
  if (!window._ytAuthenticated) {
    await _publishToYouTubeManual(videoInput);
    return;
  }

  const isFileInput = typeof File !== 'undefined' && videoInput instanceof File;
  const videoPath = isFileInput ? videoInput.name : String(videoInput || '').trim();

  if (!videoPath) {
    alert('Không có video để upload');
    return;
  }

  const title = _getPublishTitle('youtube', videoPath);
  if (!title) {
    alert('Vui lòng nhập tiêu đề');
    return;
  }

  // Build hashtags from filename
  const { hashtags } = await _buildPublishTitleAndTags('youtube', videoPath);
  const defaultTags = ['douyin', 'tiktok', 'video'];
  const allTags = [...new Set([...defaultTags, ...hashtags.map(h => h.slice(1))])]; // remove #

  const logBox = document.getElementById('publish-log');
  if (logBox) {
    logBox.innerHTML = '';
    logBox.style.display = 'block';
  }

  _setPublishStatus('Đang đăng YouTube...');
  _appendPublishLog('Bắt đầu upload lên YouTube...', 'info');

  try {
    const payload = {
      title: title,
      description: _getPublishDescription('youtube'),
      tags: allTags,
      privacy_status: _getPublishPrivacy('youtube'),
    };

    const requestOptions = isFileInput
      ? (() => {
          const form = new FormData();
          form.append('video_file', videoInput, videoInput.name);
          form.append('title', payload.title);
          form.append('description', payload.description);
          form.append('tags', JSON.stringify(payload.tags));
          form.append('privacy_status', payload.privacy_status);
          return { method: 'POST', body: form };
        })()
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_path: videoPath, ...payload }),
        };

    const res = await fetch('/api/youtube_upload', requestOptions);

    if (!res.ok) {
      let msg = 'Upload thất bại';
      try { msg = (await res.json())?.error || msg; } catch (_) {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.status === 'uploading' && typeof data.pct === 'number') {
            _appendPublishLog(`Đang upload YouTube... ${data.pct}%`, 'info');
          }
          if (data.log) _appendPublishLog(data.log, data.level || 'info');
          if (data.status === 'success' && data.url) {
            _setPublishStatus('Đã đăng YouTube');
            toast(`✓ Upload thành công! ${data.url}`, 'success');
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    const msg = String(e?.message || e || '').toLowerCase();
    if (msg.includes('insecure_transport') || msg.includes('not authenticated')) {
      await _publishToYouTubeManual(videoInput);
      return;
    }
    _setPublishStatus('Lỗi YouTube');
    _appendPublishLog('✗ Lỗi: ' + e.message, 'error');
    toast('Upload thất bại: ' + e.message, 'error');
  }
}

async function publishToTikTok(videoInput) {
  const videoPath = typeof videoInput === 'string' ? videoInput.trim() : (videoInput?.name || '').trim();
  if (!videoPath) {
    alert('Không có video để đăng');
    return;
  }

  if (!window._ttAuthenticated) {
    toast('Bạn chưa đăng nhập TikTok. Vui lòng đăng nhập trước.', 'error');
    _appendPublishLog('✗ Chưa đăng nhập TikTok API. Nhấn "Đăng nhập TikTok" trước.', 'error');
    return;
  }

  const { title, hashtags } = await _buildPublishTitleAndTags('tiktok', videoPath);
  const privacy = _getPublishPrivacy('tiktok');

  // Auto-fill hashtag field so user can see/edit
  const tagsEl = document.getElementById('tt-tags');
  if (tagsEl && !tagsEl.value.trim() && hashtags.length) {
    tagsEl.value = hashtags.join(' ');
  }
  const manualTags = (document.getElementById('tt-tags')?.value || '').trim()
    .split(/\s+/).filter(t => t.startsWith('#'));
  const allTags = [...new Set([...hashtags, ...manualTags])];

  // Append hashtags to title for TikTok caption (max 150 chars total)
  const hashtagStr = allTags.join(' ');
  const caption = hashtagStr ? `${title} ${hashtagStr}`.slice(0, 150) : title.slice(0, 150);

  const logBox = document.getElementById('publish-log');
  if (logBox) { logBox.innerHTML = ''; logBox.style.display = 'block'; }

  _setPublishStatus('Đang đăng TikTok...');
  _appendPublishLog('Bắt đầu upload lên TikTok...', 'info');

  try {
    const res = await fetch('/api/tiktok_upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_path: videoPath, title: caption, privacy_level: privacy.toUpperCase() }),
    });

    if (!res.ok) {
      let msg = 'Upload thất bại';
      try { msg = (await res.json())?.error || msg; } catch (_) {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.log) _appendPublishLog(data.log, data.level || 'info');
          if (data.publish_id) {
            _setPublishStatus('✓ Đã đăng TikTok');
            toast('✓ Upload TikTok thành công!', 'success');
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    _setPublishStatus('Lỗi TikTok');
    _appendPublishLog('✗ Lỗi: ' + (e.message || e), 'error');
    toast('Upload TikTok thất bại: ' + (e.message || e), 'error');
  }
}

async function savePublishSettings() {
  try {
    const current = await API.get('/api/config') || {};
    const payload = {
      translation: {
        ...(current.translation || {}),
        naming_enabled: true,
      },
      upload: {
        platform: document.getElementById('publish-platform')?.value || 'youtube',
        auto_upload: _getPublishAutoUpload(),
        youtube: {
          title_template: document.getElementById('yt-title')?.value || '{title}',
          description_template: document.getElementById('yt-desc')?.value || '{title}',
          privacy_status: document.getElementById('yt-privacy')?.value || 'private',
        },
        tiktok: {
          title_template: document.getElementById('tt-title')?.value || '{title}',
          caption_template: document.getElementById('tt-desc')?.value || '{title}',
          privacy_status: document.getElementById('tt-privacy')?.value || 'public',
        },
      },
    };
    await API.post('/api/config', payload);
    localStorage.setItem('publish_auto_upload', String(_getPublishAutoUpload()));
    toast('Đã lưu cấu hình đăng', 'success');
  } catch (e) {
    toast('Không lưu được cấu hình: ' + e.message, 'error');
  }
}

async function publishBothOrSingle(target) {
  const videoPath = window._publishLastOutputPath || window._ytLastOutputPath || window._procSelectedFile || '';
  if (!videoPath) {
    toast('Chưa có file đầu ra để đăng', 'warning');
    return;
  }

  const logBox = document.getElementById('publish-log');
  if (logBox) { logBox.innerHTML = ''; logBox.style.display = 'block'; }

  const t = target || window._publishPlatform || 'youtube';
  if (t === 'tiktok' || t === 'both') await publishToTikTok(videoPath);
  if (t === 'youtube' || t === 'both') await uploadToYouTube(videoPath);
}

async function publishSelectedPlatform() {
  const platform = window._publishPlatform || document.getElementById('publish-platform')?.value || 'youtube';
  if (window._procFileQueue.length) {
    await publishQueueToTarget(platform);
  } else {
    await publishBothOrSingle(platform);
  }
}

/* ── Anti-Fingerprint config helpers ────────────────────────────────────── */
function getAntiFingerprintConfig() {
  const getInput = (procId, cfgId) => {
    const procEl = document.getElementById(procId);
    if (procEl) return procEl;
    return document.getElementById(cfgId);
  };

  const enabledEl = getInput('anti-fingerprint-enabled', 'cfg-anti-fingerprint-enabled');
  const overlayEl = getInput('overlay-image-path', 'cfg-overlay-image-path');
  const opacityEl = getInput('overlay-opacity', 'cfg-overlay-opacity');
  const logoEnabledEl = getInput('logo-enabled', 'cfg-logo-enabled');
  const logoEl = getInput('logo-image-path', 'cfg-logo-image-path');
  const logoPosEl = getInput('logo-position', 'cfg-logo-position');

  return {
    anti_fingerprint: {
      enabled: enabledEl?.checked ?? false,
      overlay_image: overlayEl?.value?.trim() || '',
      overlay_opacity: parseFloat(opacityEl?.value || '0.02'),
      logo_enabled: logoEnabledEl?.checked ?? false,
      logo_image: logoEl?.value?.trim() || '',
      logo_position: logoPosEl?.value || 'bottom-left',
    },
  };
}

async function _saveAntiFingerprintConfig() {
  try {
    const af = getAntiFingerprintConfig();
    await API.post('/api/config', { video_process: af });
  } catch (e) {
    console.warn('save anti-fingerprint config error:', e);
  }
}
