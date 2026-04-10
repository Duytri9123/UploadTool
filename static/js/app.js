/* ── app.js — Entry point ────────────────────────────────────────────────── */

window._trSelectedFile = null;

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
    { value: 'Calm_Woman',      label: 'Calm Woman (MiniMax - Nữ)' },
    { value: 'Gentle_Woman',    label: 'Gentle Woman (MiniMax - Nữ)' },
    { value: 'Lively_Girl',     label: 'Lively Girl (MiniMax - Nữ)' },
    { value: 'Soft_Female',     label: 'Soft Female (MiniMax - Nữ)' },
    { value: 'Confident_Man',   label: 'Confident Man (MiniMax - Nam)' },
    { value: 'Deep_Voice_Man',  label: 'Deep Voice Man (MiniMax - Nam)' },
    { value: 'Energetic_Male',  label: 'Energetic Male (MiniMax - Nam)' },
    { value: 'Friendly_Person', label: 'Friendly Person (MiniMax)' },
  ],
  gtts: [
    { value: 'vi', label: 'Vietnamese (gTTS)' },
  ],
};

const TTS_DEFAULT_VOICE = {
  'fpt-ai':  'banmai',
  'edge-tts': 'vi-VN-HoaiMyNeural',
  'minimax': 'Calm_Woman',
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

function toggleCard(header) {
  const card = header.closest('.card');
  if (card && card.classList.contains('card-collapsible')) {
    card.classList.toggle('collapsed');
  }
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
    blur_original:    document.getElementById('proc-blur-original')?.checked ?? true,
    translate_subs:   document.getElementById('proc-translate-subs')?.checked ?? true,
    burn_vi_subs:     document.getElementById('proc-burn-vi')?.checked ?? true,
    subtitle_format:  'ass',
    font_size:        parseInt(document.getElementById('proc-font-size')?.value || '32'),
    font_color:       document.getElementById('proc-font-color')?.value || 'white',
    margin_v:         parseInt(document.getElementById('proc-margin-v')?.value || '20'),
    subtitle_position: document.getElementById('proc-sub-pos')?.value || 'bottom',
    transcribe_provider: _getProcessProvider('transcribe'),
    translate_provider: _getProcessProvider('translate'),
    voice_convert:    document.getElementById('proc-voice')?.checked ?? false,
    tts_engine:       document.getElementById('proc-tts-engine')?.value || 'edge-tts',
    tts_voice:        document.getElementById('proc-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
    tts_pitch:        _sanitizeVoiceParam(document.getElementById('proc-tts-pitch')?.value || '+0Hz'),
    tts_rate:         _sanitizeVoiceParam(document.getElementById('proc-tts-rate')?.value || '+0%'),
    tts_emotion:      document.getElementById('proc-tts-emotion')?.value || 'default',
    keep_bg_music:    document.getElementById('proc-keep-bg')?.checked ?? false,
    bg_volume:        parseFloat(document.getElementById('proc-bg-vol')?.value || '0.15'),
    tts_speed:        parseFloat(document.getElementById('proc-tts-speed')?.value || '1.0'),
    auto_speed:       document.getElementById('proc-auto-speed')?.checked ?? true,
    process_mode:     window._procMode || 'ai',
    // Voice FX (Review style)
    fx_enabled:       document.getElementById('proc-fx-enabled')?.checked ?? false,
    fx_pitch:         parseFloat(document.getElementById('proc-fx-pitch')?.value || '1.5'),
    fx_speed:         parseFloat(document.getElementById('proc-fx-speed')?.value || '1.08'),
    fx_bass:          parseInt(document.getElementById('proc-fx-bass')?.value || '-2'),
    fx_mid:           parseInt(document.getElementById('proc-fx-mid')?.value || '2'),
    fx_treble:        parseInt(document.getElementById('proc-fx-treble')?.value || '3'),
    fx_comp:          document.getElementById('proc-fx-comp')?.value || 'light',
    fx_reverb:        parseInt(document.getElementById('proc-fx-reverb')?.value || '5'),
    // Anti-Fingerprint
    afp_enabled:      document.getElementById('proc-afp-enabled')?.checked ?? false,
    afp_flip:         document.getElementById('proc-afp-flip')?.checked ?? false,
    afp_vignette:     document.getElementById('proc-afp-vignette')?.checked ?? false,
    afp_vertical:     document.getElementById('proc-afp-vertical')?.checked ?? false,
    afp_scale_w:      parseInt(document.getElementById('proc-afp-scale-w')?.value || '0'),
    afp_scale_h:      parseInt(document.getElementById('proc-afp-scale-h')?.value || '0'),
    afp_brightness:   parseFloat(document.getElementById('proc-afp-brightness')?.value || '0.02'),
    afp_contrast:     parseFloat(document.getElementById('proc-afp-contrast')?.value || '1.03'),
    afp_speed:        parseFloat(document.getElementById('proc-afp-speed')?.value || '1.0'),
    afp_overlay_img:  document.getElementById('proc-afp-overlay-img')?.value || '',
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
          // Auto-publish to the selected platform if enabled
          if (window._publishLastOutputPath && document.getElementById('publish-auto-upload')?.checked) {
            setTimeout(() => {
              if (confirm('Bắt đầu đăng video lên nền tảng đã chọn?')) {
                publishSelectedPlatform();
              }
            }, 1000);
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

async function extractAudioOnly() {
  const filePath = document.getElementById('tr-file')?.value?.trim() || '';
  const outDir   = document.getElementById('tr-out')?.value?.trim() || '';
  const selectedFile = window._trSelectedFile || document.getElementById('tr-import-file')?.files?.[0] || null;

  if (!filePath && !selectedFile) {
    alert('Vui lòng chọn file video trước.');
    return;
  }

  _appendTrLog('Đang tách MP3...', 'info');

  try {
    let res;
    if (selectedFile) {
      const form = new FormData();
      form.append('video_file', selectedFile);
      if (outDir) form.append('output_dir', outDir);
      res = await fetch('/api/extract_audio', { method: 'POST', body: form });
    } else {
      res = await fetch('/api/extract_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: filePath, output_dir: outDir }),
      });
    }
    const data = await res.json();
    if (data.ok) {
      _appendTrLog('✅ Tách MP3 thành công: ' + data.output_path, 'success');
      toast('Tách MP3 thành công', 'success');
    } else {
      _appendTrLog('❌ Lỗi: ' + (data.error || 'Unknown'), 'error');
    }
  } catch (err) {
    _appendTrLog('❌ Lỗi kết nối: ' + err, 'error');
  }
}

async function generateTtsFromAss() {
  const filePath = document.getElementById('tr-file')?.value?.trim() || '';
  const outDir   = document.getElementById('tr-out')?.value?.trim() || '';
  const selectedFile = window._trSelectedFile || document.getElementById('tr-import-file')?.files?.[0] || null;

  if (!filePath && !selectedFile) {
    alert('Vui lòng chọn file .ass trước.');
    return;
  }

  const btn = document.querySelector('[onclick="generateTtsFromAss()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo...'; }
  clearLog('tr-log');
  _setTrProgress(0, '--', 0, '--');

  const params = {
    output_dir:  outDir,
    tts_engine:  document.getElementById('tr-tts-engine')?.value  || 'edge-tts',
    tts_voice:   document.getElementById('tr-tts-voice')?.value   || 'vi-VN-HoaiMyNeural',
    tts_pitch:   _sanitizeVoiceParam(document.getElementById('tr-tts-pitch')?.value  || '+0Hz'),
    tts_rate:    _sanitizeVoiceParam(document.getElementById('tr-tts-rate')?.value   || '+0%'),
    tts_emotion: document.getElementById('tr-tts-emotion')?.value || 'default',
    fx_enabled:  String(document.getElementById('tr-fx-enabled')?.checked || false),
    fx_pitch:    document.getElementById('tr-fx-pitch')?.value   || '1.5',
    fx_speed:    document.getElementById('tr-fx-speed')?.value   || '1.08',
    fx_bass:     document.getElementById('tr-fx-bass')?.value    || '-2',
    fx_mid:      document.getElementById('tr-fx-mid')?.value     || '2',
    fx_treble:   document.getElementById('tr-fx-treble')?.value  || '3',
    fx_comp:     document.getElementById('tr-fx-comp')?.value    || 'none',
    fx_reverb:   document.getElementById('tr-fx-reverb')?.value  || '0',
  };

  const restore = () => {
    if (btn) { btn.disabled = false; btn.textContent = 'Tạo MP3 từ file .ass'; }
  };

  try {
    let res;
    if (selectedFile) {
      const form = new FormData();
      form.append('ass_file', selectedFile);
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

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const read = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { restore(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const d = JSON.parse(trimmed);
            if (d.log) _appendTrLog(d.log, d.level || 'info');
            if (d.overall !== undefined) _setTrProgress(d.overall, d.overall_lbl || '--', 0, '--');
            if (d.ok === true) toast('Tạo MP3 thành công: ' + d.output_path, 'success');
            if (d.ok === false) toast('Lỗi: ' + (d.error || 'Unknown'), 'error');
          } catch (_) {
            _appendTrLog(trimmed, 'info');
          }
        }
      }
    };
    await read();
  } catch (err) {
    _appendTrLog('❌ Lỗi kết nối: ' + err, 'error');
    restore();
  }
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
        tts_pitch: _sanitizeVoiceParam(document.getElementById('tr-tts-pitch')?.value || '+0Hz'),
        tts_rate: _sanitizeVoiceParam(document.getElementById('tr-tts-rate')?.value || '+0%'),
        tts_emotion: document.getElementById('tr-tts-emotion')?.value || 'default',
        fx_enabled: document.getElementById('tr-fx-enabled')?.checked || false,
        fx_pitch: parseFloat(document.getElementById('tr-fx-pitch')?.value || '1.5'),
        fx_speed: parseFloat(document.getElementById('tr-fx-speed')?.value || '1.08'),
        fx_bass: parseFloat(document.getElementById('tr-fx-bass')?.value || '-2'),
        fx_mid: parseFloat(document.getElementById('tr-fx-mid')?.value || '2'),
        fx_treble: parseFloat(document.getElementById('tr-fx-treble')?.value || '3'),
        fx_comp: document.getElementById('tr-fx-comp')?.value || 'none',
        fx_reverb: parseFloat(document.getElementById('tr-fx-reverb')?.value || '0'),
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

async function previewProcessVoice() {
  const text = 'Xin chào, đây là phần nghe thử giọng đọc xử lý video.';
  const btn = document.querySelector('button[onclick="previewProcessVoice()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo...'; }

  try {
    const res = await fetch('/api/tts_preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        tts_engine: document.getElementById('proc-tts-engine')?.value || 'edge-tts',
        tts_voice: document.getElementById('proc-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
        tts_pitch: _sanitizeVoiceParam(document.getElementById('proc-tts-pitch')?.value || '+0Hz'),
        tts_rate: _sanitizeVoiceParam(document.getElementById('proc-tts-rate')?.value || '+0%'),
        tts_emotion: document.getElementById('proc-tts-emotion')?.value || 'default',
      }),
    });

    if (!res.ok) throw new Error('Preview failed');
    const blob = await res.blob();
    const audio = document.getElementById('proc-preview-audio');
    if (audio) {
      if (window._procPreviewUrl) URL.revokeObjectURL(window._procPreviewUrl);
      window._procPreviewUrl = URL.createObjectURL(blob);
      audio.src = window._procPreviewUrl;
      audio.style.display = 'block';
      audio.play();
    }
  } catch (err) {
    alert('Lỗi: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Nghe thử'; }
  }
}
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
  document.getElementById('vp-tts-engine')?.addEventListener('change', function() {
    _syncVoiceOptions('vp-tts-engine', 'vp-tts-voice');
  });
  _syncVoiceOptions('proc-tts-engine', 'proc-tts-voice');
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

  // Clear selected file when user manually types a path
  document.getElementById('tr-file')?.addEventListener('input', function() {
    if (this.value.trim()) {
      window._trSelectedFile = null;
      const nameLabel = document.getElementById('tr-file-name');
      if (nameLabel) nameLabel.textContent = '--';
      const fileInput = document.getElementById('tr-import-file');
      if (fileInput) fileInput.value = '';
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

  // Handle collapsible cards
  document.querySelectorAll('.card-collapsible .card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on an interactive element inside header
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.closest('.card-actions')) {
        return;
      }
      toggleCard(header);
    });
  });

  _initProcessConfigSync();
});

/* ── Synchronization between Process and Config ─────────────────────────── */
function _initProcessConfigSync() {
  const mapping = [
    { proc: 'proc-model', cfg: 'vp-model' },
    { proc: 'proc-lang', cfg: 'vp-lang' },
    { proc: 'proc-burn', cfg: 'vp-burn', type: 'checkbox' },
    { proc: 'proc-translate-subs', cfg: 'vp-translate', type: 'checkbox' },
    { proc: 'proc-burn-vi', cfg: 'vp-burn-vi', type: 'checkbox' },
    { proc: 'proc-voice', cfg: 'vp-voice', type: 'checkbox' },
    { proc: 'proc-keep-bg', cfg: 'vp-keep-bg', type: 'checkbox' },
    { proc: 'proc-tts-voice', cfg: 'vp-tts-voice' },
    { proc: 'proc-font-size', cfg: 'vp-font-size' },
    { proc: 'proc-blur-original', cfg: 'vp-blur-original', type: 'checkbox' },
    { proc: 'proc-tts-engine', cfg: 'vp-tts-engine' },
    { proc: 'proc-bg-vol', cfg: 'vp-bg-volume' },
    { proc: 'proc-tts-pitch', cfg: 'vp-tts-pitch' },
    { proc: 'proc-tts-rate', cfg: 'vp-tts-rate' },
    { proc: 'proc-tts-emotion', cfg: 'vp-tts-emotion' },
    { proc: 'proc-afp-enabled', cfg: 'vp-afp-enabled', type: 'checkbox' },
    { proc: 'proc-afp-flip',    cfg: 'vp-afp-flip',    type: 'checkbox' },
    { proc: 'proc-afp-vignette',cfg: 'vp-afp-vignette',type: 'checkbox' },
    { proc: 'proc-afp-vertical',cfg: 'vp-afp-vertical',type: 'checkbox' },
    { proc: 'proc-afp-scale-w', cfg: 'vp-afp-scale-w' },
    { proc: 'proc-afp-scale-h', cfg: 'vp-afp-scale-h' },
    { proc: 'proc-afp-overlay-img', cfg: 'vp-afp-overlay-img' }
  ];

  mapping.forEach(m => {
    const pEl = document.getElementById(m.proc);
    const cEl = document.getElementById(m.cfg);
    if (!pEl || !cEl) return;

    const sync = (src, dest) => {
      if (m.type === 'checkbox') dest.checked = src.checked;
      else dest.value = src.value;
      dest.dispatchEvent(new Event('change'));
    };

    pEl.addEventListener('change', () => sync(pEl, cEl));
    cEl.addEventListener('change', () => sync(cEl, pEl));
  });
}

function syncProcessConfigFromLoaded() {
  const mapping = [
    { proc: 'proc-model', cfg: 'vp-model' },
    { proc: 'proc-lang', cfg: 'vp-lang' },
    { proc: 'proc-burn', cfg: 'vp-burn', type: 'checkbox' },
    { proc: 'proc-translate-subs', cfg: 'vp-translate', type: 'checkbox' },
    { proc: 'proc-burn-vi', cfg: 'vp-burn-vi', type: 'checkbox' },
    { proc: 'proc-voice', cfg: 'vp-voice', type: 'checkbox' },
    { proc: 'proc-keep-bg', cfg: 'vp-keep-bg', type: 'checkbox' },
    { proc: 'proc-tts-voice', cfg: 'vp-tts-voice' },
    { proc: 'proc-font-size', cfg: 'vp-font-size' },
    { proc: 'proc-blur-original', cfg: 'vp-blur-original', type: 'checkbox' },
    { proc: 'proc-tts-engine', cfg: 'vp-tts-engine' },
    { proc: 'proc-bg-vol', cfg: 'vp-bg-volume' },
    { proc: 'proc-tts-pitch', cfg: 'vp-tts-pitch' },
    { proc: 'proc-tts-rate', cfg: 'vp-tts-rate' },
    { proc: 'proc-tts-emotion', cfg: 'vp-tts-emotion' },
    { proc: 'proc-afp-enabled', cfg: 'vp-afp-enabled', type: 'checkbox' },
    { proc: 'proc-afp-flip',    cfg: 'vp-afp-flip',    type: 'checkbox' },
    { proc: 'proc-afp-vignette',cfg: 'vp-afp-vignette',type: 'checkbox' },
    { proc: 'proc-afp-vertical',cfg: 'vp-afp-vertical',type: 'checkbox' },
    { proc: 'proc-afp-scale-w', cfg: 'vp-afp-scale-w' },
    { proc: 'proc-afp-scale-h', cfg: 'vp-afp-scale-h' },
    { proc: 'proc-afp-overlay-img', cfg: 'vp-afp-overlay-img' }
  ];

  mapping.forEach(m => {
    const pEl = document.getElementById(m.proc);
    const cEl = document.getElementById(m.cfg);
    if (pEl && cEl) {
      if (m.type === 'checkbox') pEl.checked = cEl.checked;
      else pEl.value = cEl.value;
      pEl.dispatchEvent(new Event('change'));
    }
  });
}

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
      tags: ['douyin', 'tiktok', 'video'],
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
async function previewConfigVoice() {
  const text = 'Xin chào, đây là phần nghe thử giọng đọc từ cấu hình.';
  const btn = document.querySelector('button[onclick="previewConfigVoice()"]');
  const audio = document.getElementById('vp-preview-audio');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const res = await fetch('/api/tts_preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        tts_engine: document.getElementById('vp-tts-engine')?.value || 'edge-tts',
        tts_voice: document.getElementById('vp-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
        tts_pitch: _sanitizeVoiceParam(document.getElementById('vp-tts-pitch')?.value || '+0Hz'),
        tts_rate: _sanitizeVoiceParam(document.getElementById('vp-tts-rate')?.value || '+0%'),
        tts_emotion: document.getElementById('vp-tts-emotion')?.value || 'default',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi preview');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (audio) {
      audio.src = url;
      audio.style.display = 'inline-block';
      audio.play();
    }
  } catch (err) {
    alert('Lỗi preview giọng: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function _sanitizeVoiceParam(val) {
  if (!val) return '+0%';
  val = String(val).trim();
  // Ensure starts with + or -
  if (!val.startsWith('+') && !val.startsWith('-')) {
    val = '+' + val;
  }
  // Fallback to % if no unit
  if (!val.endsWith('%') && !val.endsWith('Hz')) {
    val += '%';
  }
  return val;
}

/* ── Upload Overlay Image ───────────────────────────────────────────────── */
async function uploadOverlay(input, type) {
  const file = input?.files?.[0];
  if (!file) return;

  const form = new FormData();
  form.append('file', file);
  form.append('type', type || 'overlay');

  try {
    const res = await fetch('/api/upload_anti_fp_image', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload thất bại');
    const data = await res.json();
    if (data.path) {
      // Fill path into all AFP overlay inputs
      const imgInputs = ['proc-afp-overlay-img', 'vp-afp-overlay-img'];
      imgInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data.path;
      });
      toast('✓ Đã upload: ' + file.name, 'success');
    }
  } catch (err) {
    alert('Lỗi upload ảnh: ' + err.message);
  }
  input.value = '';
}
