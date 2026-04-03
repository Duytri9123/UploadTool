/* ── Config page ─────────────────────────────────────────────────────────── */
async function loadConfig() {
  const cfg = await API.get('/api/config');
  if (!cfg) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  // Basic settings
  const links = cfg.link || cfg.links || [];
  set('cfg-urls', Array.isArray(links) ? links.join('\n') : links);
  set('cfg-path', cfg.path || './Downloaded/');
  set('cfg-proxy', cfg.proxy || '');
  set('cfg-thread', cfg.thread ?? 5);
  set('cfg-retry', cfg.retry_times ?? 3);
  set('cfg-start', cfg.start_date || '');
  set('cfg-end', cfg.end_date || '');

  // Modes
  const modes = cfg.mode || [];
  document.querySelectorAll('#mode-checks input[type=checkbox]').forEach(cb => {
    cb.checked = modes.includes(cb.value);
  });

  // Max counts
  const maxCounts = cfg.max_counts || {};
  ['post','like','collect','music','mix','collectmix'].forEach(m => {
    set('n-' + m, maxCounts[m] ?? 0);
  });

  // Options
  setChk('opt-music', cfg.music !== false);
  setChk('opt-cover', cfg.cover !== false);
  setChk('opt-json', cfg.json !== false);
  setChk('opt-folder', cfg.folder !== false);

  // Translation — keys nằm trong cfg.translation.*
  const tr = cfg.translation || {};
  set('cfg-preferred-provider', tr.preferred_provider || cfg.preferred_provider || 'auto');
  set('cfg-deepseek-key', tr.deepseek_key || '');
  set('cfg-openai-key', tr.openai_key || '');
  set('cfg-hf-token', tr.hf_token || '');

  // Video processing
  setChk('vp-enabled', cfg.video_process?.enabled);
  set('vp-model', cfg.video_process?.model || 'base');
  set('vp-lang', cfg.video_process?.language || 'zh');
  setChk('vp-burn', cfg.video_process?.burn_subs !== false);
  setChk('vp-blur', cfg.video_process?.blur_original !== false);
  setChk('vp-translate', cfg.video_process?.translate !== false);
  setChk('vp-burn-vi', cfg.video_process?.burn_vi_subs !== false);
  setChk('vp-voice', cfg.video_process?.voice_convert);
  setChk('vp-keep-bg', cfg.video_process?.keep_bg !== false);
  set('vp-blur-zone', cfg.video_process?.blur_zone || 'bottom');
  set('vp-tts-voice', cfg.video_process?.tts_voice || 'vi-VN-HoaiMyNeural');
  set('vp-font-size', cfg.video_process?.font_size ?? 18);
  set('vp-blur-height', cfg.video_process?.blur_height ?? 15);
}

async function saveConfig() {
  const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const getChk = id => { const el = document.getElementById(id); return el ? el.checked : false; };

  const modes = [];
  document.querySelectorAll('#mode-checks input[type=checkbox]:checked').forEach(cb => modes.push(cb.value));

  const maxCounts = {};
  ['post','like','collect','music','mix','collectmix'].forEach(m => {
    maxCounts[m] = parseInt(get('n-' + m)) || 0;
  });

  const urlsRaw = get('cfg-urls').trim();
  const links = urlsRaw ? urlsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

  const data = {
    link: links,
    path: get('cfg-path'),
    proxy: get('cfg-proxy'),
    thread: parseInt(get('cfg-thread')) || 5,
    retry_times: parseInt(get('cfg-retry')) || 3,
    start_date: get('cfg-start'),
    end_date: get('cfg-end'),
    mode: modes,
    max_counts: maxCounts,
    music: getChk('opt-music'),
    cover: getChk('opt-cover'),
    json: getChk('opt-json'),
    folder: getChk('opt-folder'),
    translation: {
      preferred_provider: get('cfg-preferred-provider'),
      deepseek_key: get('cfg-deepseek-key'),
      openai_key: get('cfg-openai-key'),
      hf_token: get('cfg-hf-token'),
    },
    video_process: {
      enabled: getChk('vp-enabled'),
      model: get('vp-model'),
      language: get('vp-lang'),
      burn_subs: getChk('vp-burn'),
      blur_original: getChk('vp-blur'),
      translate: getChk('vp-translate'),
      burn_vi_subs: getChk('vp-burn-vi'),
      voice_convert: getChk('vp-voice'),
      keep_bg: getChk('vp-keep-bg'),
      blur_zone: get('vp-blur-zone'),
      tts_voice: get('vp-tts-voice'),
      font_size: parseInt(get('vp-font-size')) || 18,
      blur_height: parseInt(get('vp-blur-height')) || 15,
    }
  };

  await API.post('/api/config', data);
  toast(t('toast_config_saved'), 'success');
}
