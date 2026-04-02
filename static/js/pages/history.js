async function loadHistory() {
  const rows = await API.get('/api/history');
  const tbody = document.getElementById('history-body');
  if (!rows.length || rows.error) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--dim);text-align:center">No history</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.time}</td>
      <td class="td-url" title="${r.url}">${r.url}</td>
      <td><span class="badge-type">${r.type}</span></td>
      <td>${r.total}</td>
      <td style="color:var(--green)">${r.success}</td>
    </tr>`).join('');
}

async function clearHistory() {
  if (!confirm('Clear all download history?')) return;
  await API.post('/api/history/clear', {});
  loadHistory();
  toast('History cleared', 'success');
}

loadHistory();
