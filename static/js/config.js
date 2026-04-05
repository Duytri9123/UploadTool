/* ── Config page ─────────────────────────────────────────────────────────── */
async function loadConfig() {
  const cfg = await API.get('/api/config');
  if (!cfg) return;
  window._loadedCfg = cfg;

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
  setChk('opt-music', cfg.music === true);
  setChk('opt-cover', cfg.cover === true);
  setChk('opt-json', cfg.json === true);
  setChk('opt-folder', cfg.folderstyle === true || cfg.folder === true);

  // Translation — keys nằm trong cfg.translation.*
  const tr = cfg.translation || {};
  set('cfg-preferred-provider', tr.preferred_provider || cfg.preferred_provider || 'auto');
  set('cfg-deepseek-key', tr.deepseek_key || '');
  set('cfg-openai-key', tr.openai_key || '');
  set('cfg-hf-token', tr.hf_token || '');
  setChk('cfg-naming-enabled', tr.naming_enabled !== false);

  // Upload defaults
  const upload = cfg.upload || {};
  set('cfg-upload-platform', upload.platform || 'youtube');
  setChk('cfg-upload-auto', upload.auto_upload === true);
  set('cfg-yt-title-template', upload.youtube?.title_template || '{title}');
  set('cfg-yt-desc-template', upload.youtube?.description_template || '{title}');
  set('cfg-yt-privacy', upload.youtube?.privacy_status || 'private');
  set('cfg-tt-title-template', upload.tiktok?.title_template || '{title}');
  set('cfg-tt-caption-template', upload.tiktok?.caption_template || '{title}');
  set('cfg-tt-privacy', upload.tiktok?.privacy_status || 'private');

  // Video processing
  setChk('vp-enabled', cfg.video_process?.enabled !== false);
  set('vp-model', cfg.video_process?.model || 'base');
  set('vp-lang', cfg.video_process?.language || 'zh');
  setChk('vp-burn', cfg.video_process?.burn_subs !== false);
  setChk('vp-blur', cfg.video_process?.blur_original === true);
  setChk('vp-translate', cfg.video_process?.translate !== false);
  setChk('vp-burn-vi', cfg.video_process?.burn_vi_subs !== false);
  setChk('vp-voice', cfg.video_process?.voice_convert !== false);
  setChk('vp-keep-bg', cfg.video_process?.keep_bg_music === true || cfg.video_process?.keep_bg === true);
  set('vp-blur-zone', cfg.video_process?.blur_zone || 'bottom');
  set('vp-tts-voice', cfg.video_process?.tts_voice || 'vi-VN-HoaiMyNeural');
  set('vp-font-size', cfg.video_process?.font_size ?? 22);
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
      naming_enabled: getChk('cfg-naming-enabled'),
    },
    upload: {
      platform: get('cfg-upload-platform') || 'youtube',
      auto_upload: getChk('cfg-upload-auto'),
      youtube: {
        title_template: get('cfg-yt-title-template') || '{title}',
        description_template: get('cfg-yt-desc-template') || '{title}',
        privacy_status: get('cfg-yt-privacy') || 'private',
      },
      tiktok: {
        title_template: get('cfg-tt-title-template') || '{title}',
        caption_template: get('cfg-tt-caption-template') || '{title}',
        privacy_status: get('cfg-tt-privacy') || 'private',
      },
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
      keep_bg_music: getChk('vp-keep-bg'),
      keep_bg: getChk('vp-keep-bg'),
      blur_zone: get('vp-blur-zone'),
      tts_voice: get('vp-tts-voice'),
      font_size: parseInt(get('vp-font-size')) || 22,
      subtitle_format: 'ass',
    }
  };

  await API.post('/api/config', data);
  toast(t('toast_config_saved'), 'success');
}
