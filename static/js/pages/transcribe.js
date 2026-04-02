async function startTranscribe() {
  const btn = document.getElementById('btn-tr');
  btn.disabled = true; btn.textContent = '⏳ Running…';
  clearLog('tr-log');
  setProgress('pb-tr-overall','lbl-tr-overall', 0, '—');
  setProgress('pb-tr-file',   'lbl-tr-file',    0, '—');

  const payload = {
    folder:  document.getElementById('tr-dir').value,
    single:  document.getElementById('tr-file').value,
    model:   document.getElementById('tr-model').value,
    lang:    document.getElementById('tr-lang').value,
    out_dir: document.getElementById('tr-out').value,
    srt:     document.getElementById('tr-srt').checked,
    skip:    document.getElementById('tr-skip').checked,
    sc:      document.getElementById('tr-sc').checked,
  };

  try {
    const r = await fetch('/api/transcribe', {method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      dec.decode(value).split('\n').filter(Boolean).forEach(line => {
        try {
          const d = JSON.parse(line);
          if (d.log) appendLog('tr-log', d.log, d.level||'info');
          if (d.overall !== undefined) setProgress('pb-tr-overall','lbl-tr-overall', d.overall, d.overall_lbl||'');
          if (d.file    !== undefined) setProgress('pb-tr-file',   'lbl-tr-file',    d.file,    d.file_lbl||'');
        } catch(e) {}
      });
    }
    toast('Transcription done', 'success');
  } catch(e) {
    appendLog('tr-log', '✗ ' + e.message, 'error');
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '▶ Start Transcribe';
  }
}
