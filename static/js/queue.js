/* ── Download Queue ──────────────────────────────────────────────────────── */
let _queue = [], _dlRunning = false;
let _downloadingUrl = null; // URL đang được tải
let _queueItemProgress = Object.create(null);
let _queueItemState = Object.create(null);

function _resolveQueueProcessOptions() {
  const burnEnabled = document.getElementById('proc-burn')?.checked ?? true;
  const burnVi = burnEnabled && (document.getElementById('proc-burn-vi')?.checked ?? true);
  const voiceVi = document.getElementById('proc-voice')?.checked ?? false;
  const translateSubs = document.getElementById('proc-translate-subs')?.checked ?? true;
  const keepBg = document.getElementById('proc-keep-bg')?.checked ?? false;
  const provider = (typeof _getProcessProvider === 'function')
    ? (_getProcessProvider('translate') || 'deepseek')
    : (document.getElementById('proc-trans-provider-ai')?.value || 'deepseek');

  return {
    enabled: burnVi || voiceVi,
    burn_vi_subs: burnVi,
    voice_convert: voiceVi,
    translate_subs: translateSubs,
    keep_bg_music: keepBg,
    translate_provider: provider,
  };
}

function setQueueItemProgress(url, pct, label) {
  if (!url) return;
  _queueItemProgress[url] = {
    pct: Math.max(0, Math.min(100, Number(pct) || 0)),
    label: label || '',
    ts: Date.now(),
  };
  renderQueue();
}

function markQueueItemState(url, state) {
  if (!url) return;
  _queueItemState[url] = state || '';
  renderQueue();
}

function _cleanupQueueRuntimeState() {
  const urls = new Set(_queue.map(i => i.url));
  Object.keys(_queueItemProgress).forEach(url => {
    if (!urls.has(url) && url !== _downloadingUrl) delete _queueItemProgress[url];
  });
  Object.keys(_queueItemState).forEach(url => {
    if (!urls.has(url) && url !== _downloadingUrl) delete _queueItemState[url];
  });
}

async function loadQueue() {
  const data = await API.get('/api/queue');
  _queue = data || [];
  renderQueue();
}

function renderQueue() {
  const el = document.getElementById('queue-list');
  const cnt = document.getElementById('queue-count');
  _cleanupQueueRuntimeState();
  if (cnt) cnt.textContent = _queue.length;
  if (!el) return;
  if (!_queue.length) {
    el.innerHTML = '<div class="empty-state">' + t('lbl_queue_empty') + '</div>';
    return;
  }
  el.innerHTML = _queue.map((item, idx) => {
    const thumb = item.cover ? '/api/proxy_image?url=' + encodeURIComponent(item.cover) : '';
    const isDownloading = _downloadingUrl && item.url === _downloadingUrl;
    const isNext = !isDownloading && _downloadingUrl && idx === _queue.findIndex(q => q.url !== _downloadingUrl && _queue.indexOf(q) > _queue.findIndex(q2 => q2.url === _downloadingUrl));

    let statusBadge = '';
    const state = _queueItemState[item.url] || '';
    const itemProg = _queueItemProgress[item.url];
    if (isDownloading) {
      statusBadge = '<span class="queue-status downloading"><span class="spinner-sm"></span> ' + t('lbl_queue_downloading') + '</span>';
    } else if (state === 'failed') {
      statusBadge = '<span class="queue-status failed">' + t('lbl_queue_failed') + '</span>';
    } else if (_dlRunning && idx === _getNextIndex()) {
      statusBadge = '<span class="queue-status next">' + t('lbl_queue_next') + '</span>';
    }

    const progressHtml = (isDownloading || itemProg)
      ? '<div class="queue-item-progress">' +
          '<div class="queue-item-progress-head">' + t('lbl_queue_item_progress') + '</div>' +
          '<div class="queue-item-progress-bar"><div class="queue-item-progress-fill" style="width:' + Math.round(itemProg?.pct || 0) + '%"></div></div>' +
          '<div class="queue-item-progress-label">' + escHtml(itemProg?.label || '') + '</div>' +
        '</div>'
      : '';

    return '<div class="queue-item' + (isDownloading ? ' queue-item-active' : '') + '">' +
      (thumb ? '<img class="queue-thumb" src="' + thumb + '">' : '<div class="queue-thumb-ph">&#127916;</div>') +
      '<div style="flex:1;min-width:0">' +
        (isDownloading
          ? '<div class="queue-desc">' + escHtml(item.desc || item.url) + '</div>'
          : '<div class="queue-desc queue-desc-edit" data-url="' + escHtml(item.url) + '" contenteditable="true" spellcheck="false">' + escHtml(item.desc || item.url) + '</div>') +
        '<div class="queue-meta">' +
          (item.date ? '<span class="queue-date">' + item.date + '</span>' : '') +
          statusBadge +
        '</div>' +
        progressHtml +
      '</div>' +
      // Ẩn nút xóa khi đang tải item đó
      (!isDownloading
        ? '<button class="btn btn-sm btn-danger" onclick="removeFromQueue(\'' + escHtml(item.url) + '\')" title="' + escHtml(t('ttl_remove_queue_item')) + '">×</button>'
        : '<span class="queue-lock" title="' + escHtml(t('ttl_queue_item_locked')) + '">&#128274;</span>'
      ) +
    '</div>';
  }).join('');

  el.querySelectorAll('.queue-desc-edit').forEach(node => {
    node.addEventListener('click', e => e.stopPropagation());
    node.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        node.blur();
      }
    });
    node.addEventListener('blur', () => {
      const url = node.dataset.url || '';
      const text = (node.textContent || '').trim();
      updateQueueItemDesc(url, text);
    });
  });
}

// Tìm index của item tiếp theo sẽ được tải
function _getNextIndex() {
  if (!_downloadingUrl) return 0;
  const curIdx = _queue.findIndex(q => q.url === _downloadingUrl);
  return curIdx >= 0 ? curIdx + 1 : 0;
}

async function removeFromQueue(url) {
  if (url === _downloadingUrl) return; // không xóa item đang tải
  await API.post('/api/queue/remove', { url });
}

async function clearQueue() {
  if (!confirm(t('confirm_clear_queue'))) return;
  await API.post('/api/queue/clear', {});
  toast(t('toast_queue_cleared'), 'info');
}

async function addManualUrl() {
  const input = document.getElementById('manual-url');
  const url = (input?.value || '').trim();
  if (!url) return;
  const res = await API.post('/api/queue/add', [{ url, desc: url, cover: '', date: '' }]);
  input.value = '';
  if (res?.added > 0) toast(t('toast_added_queue') + ' (' + res.added + ')', 'success');
  else toast(t('toast_url_exists'), 'warning');
  loadQueue();
}

async function updateQueueItemDesc(url, desc) {
  if (!url) return;
  const safeDesc = (desc || '').trim() || url;
  const item = _queue.find(i => i.url === url);
  if (!item || (item.desc || '') === safeDesc) return;
  item.desc = safeDesc;
  await API.post('/api/queue/update', { url, desc: safeDesc });
}

function startQueueDownload() {
  _runQueueViaProcessApi();
}

function _buildQueueProcessPayload(videoUrl) {
  const queueOpts = _resolveQueueProcessOptions();
  return {
    video_path: '',
    video_url: videoUrl || '',
    out_dir: document.getElementById('proc-out')?.value?.trim() || '',
    model: document.getElementById('proc-model')?.value || 'base',
    language: document.getElementById('proc-lang')?.value || 'zh',
    burn_subs: queueOpts.burn_vi_subs,
    blur_original: document.getElementById('proc-blur-original')?.checked ?? true,
    translate_subs: queueOpts.translate_subs,
    burn_vi_subs: queueOpts.burn_vi_subs,
    subtitle_format: 'ass',
    font_size: parseInt(document.getElementById('proc-font-size')?.value || '32', 10),
    font_color: document.getElementById('proc-font-color')?.value || 'white',
    margin_v: parseInt(document.getElementById('proc-margin-v')?.value || '20', 10),
    subtitle_position: document.getElementById('proc-sub-pos')?.value || 'bottom',
    transcribe_provider: (typeof _getProcessProvider === 'function') ? _getProcessProvider('transcribe') : 'groq',
    translate_provider: queueOpts.translate_provider,
    voice_convert: queueOpts.voice_convert,
    tts_engine: document.getElementById('proc-tts-engine')?.value || 'edge-tts',
    tts_voice: document.getElementById('proc-tts-voice')?.value || 'vi-VN-HoaiMyNeural',
    keep_bg_music: queueOpts.keep_bg_music,
    bg_volume: parseFloat(document.getElementById('proc-bg-vol')?.value || '0.15'),
    process_mode: window._procMode || 'ai',
  };
}

function _runSingleQueueItem(item, index, total) {
  return new Promise(resolve => {
    const payload = _buildQueueProcessPayload(item.url);
    fetch('/api/process_video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(res => {
      if (!res.ok || !res.body) {
        _appendProcLog('[Queue] Không thể bắt đầu xử lý: ' + (item.url || ''), 'error');
        resolve(false);
        return;
      }

      _appendProcLog('[Queue ' + index + '/' + total + '] ' + (item.url || ''), 'info');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(true);
            return;
          }
          const text = decoder.decode(value, { stream: true });
          text.split('\n').filter(l => l.trim()).forEach(line => {
            try {
              const d = JSON.parse(line);
              if (d.log) _appendProcLog(d.log, d.level || 'info');
              if (d.overall !== undefined) {
                _setProcProgress(d.overall, d.overall_lbl || '');
                setQueueItemProgress(item.url, d.overall, d.overall_lbl || '');
              }
            } catch (_) {}
          });
          read();
        }).catch(() => resolve(false));
      }
      read();
    }).catch(() => {
      _appendProcLog('[Queue] Lỗi kết nối khi xử lý: ' + (item.url || ''), 'error');
      resolve(false);
    });
  });
}

async function _runQueueViaProcessApi() {
  if (!_queue.length) { toast(t('lbl_queue_empty'), 'error'); return; }
  if (_dlRunning) return;

  _dlRunning = true;
  _queueItemProgress = Object.create(null);
  _queueItemState = Object.create(null);

  const btn = document.getElementById('btn-dl');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang chạy hàng chờ...'; }

  clearLog('proc-log');
  _setProcProgress(0, 'Bắt đầu hàng chờ...');

  const queueSnapshot = [..._queue];
  const total = queueSnapshot.length;

  for (let i = 0; i < queueSnapshot.length; i += 1) {
    const item = queueSnapshot[i];
    const index = i + 1;
    _downloadingUrl = item.url;
    markQueueItemState(item.url, 'running');
    setQueueItemProgress(item.url, 0, 'Đang chờ xử lý');
    const cnt = document.getElementById('queue-count');
    if (cnt) cnt.textContent = _queue.length + ' (' + index + '/' + total + ')';

    const ok = await _runSingleQueueItem(item, index, total);

    if (ok) {
      markQueueItemState(item.url, 'done');
      setQueueItemProgress(item.url, 100, 'Hoàn tất');
      _queue = _queue.filter(q => q.url !== item.url);
      renderQueue();
      try {
        await API.post('/api/queue/remove', { url: item.url });
      } catch (_) {}
    } else {
      markQueueItemState(item.url, 'failed');
      setQueueItemProgress(item.url, 0, 'Lỗi xử lý');
    }
  }

  _downloadingUrl = null;
  _dlRunning = false;
  if (btn) { btn.disabled = false; btn.textContent = 'Chạy hàng chờ'; }

  const hasFailed = Object.values(_queueItemState).some(s => s === 'failed');
  _setProcProgress(hasFailed ? 0 : 100, hasFailed ? 'Hoàn tất có lỗi' : 'Hoàn tất hàng chờ');
  renderQueue();
  toast(hasFailed ? 'Hàng chờ hoàn tất, có mục lỗi' : 'Hàng chờ đã hoàn tất', hasFailed ? 'warning' : 'success');
}
