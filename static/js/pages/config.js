async function loadConfig() {
  const cfg = await API.get('/api/config');
  document.getElementById('cfg-urls').value = (cfg.link||[]).join('\n');
  document.getElementById('cfg-path').value = cfg.path || './Downloaded/';
  document.getElementById('cfg-proxy').value = cfg.proxy || '';
  document.getElementById('cfg-thread').value = cfg.thread || 5;
  document.getElementById('cfg-retry').value = cfg.retry_times || 3;
  document.getElementById('cfg-start').value = cfg.start_time || '';
  document.getElementById('cfg-end').value = cfg.end_time || '';
  const modes = cfg.mode || [];
  document.querySelectorAll('#mode-checks input').forEach(cb => cb.checked = modes.includes(cb.value));
  const nums = cfg.number || {};
  ['post','like','collect','music','mix','collectmix'].forEach(m => {
    const el = document.getElementById('n-'+m); if (el) el.value = nums[m]||0;
  });
  document.getElementById('opt-music').checked  = cfg.music !== false;
  document.getElementById('opt-cover').checked  = cfg.cover !== false;
  document.getElementById('opt-json').checked   = cfg.json  !== false;
  document.getElementById('opt-folder').checked = cfg.folderstyle !== false;
}

async function saveConfig() {
  const modes = [...document.querySelectorAll('#mode-checks input:checked')].map(c=>c.value);
  const number = {};
  ['post','like','collect','music','mix','collectmix'].forEach(m => {
    number[m] = parseInt(document.getElementById('n-'+m).value)||0;
  });
  await API.post('/api/config', {
    link:  document.getElementById('cfg-urls').value.split('\n').map(s=>s.trim()).filter(Boolean),
    path:  document.getElementById('cfg-path').value,
    proxy: document.getElementById('cfg-proxy').value,
    thread: parseInt(document.getElementById('cfg-thread').value)||5,
    retry_times: parseInt(document.getElementById('cfg-retry').value)||3,
    start_time: document.getElementById('cfg-start').value,
    end_time:   document.getElementById('cfg-end').value,
    mode: modes, number,
    music:      document.getElementById('opt-music').checked,
    cover:      document.getElementById('opt-cover').checked,
    json:       document.getElementById('opt-json').checked,
    folderstyle:document.getElementById('opt-folder').checked,
  });
  toast('Config saved', 'success');
}

loadConfig();
