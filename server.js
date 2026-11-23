const express = require('express'), fs = require('fs'), path = require('path'), nodemailer = require('nodemailer');
const app = express(), S = path.join(__dirname, 'sessions'), P = path.join(__dirname, 'public');
fs.mkdirSync(S, { recursive: true });
app.use(express.json({ limit: '100mb' }));
const D = path.join(__dirname, 'data'); fs.mkdirSync(D, { recursive: true });
app.get('/frame.png', (q, r) => { const f = path.join(D, 'frame.png'), d0 = path.join(P, 'img', 'default-frame.png'); fs.existsSync(f) ? r.sendFile(f) : fs.existsSync(d0) ? r.sendFile(d0) : r.sendStatus(404); });
app.use(express.static(P));
const b64 = d => Buffer.from(d.split(',')[1], 'base64');
const e = process.env;

// ---- EDIT YOUR EMAIL MESSAGE HERE ----
const MESSAGE = 'Thank you for celebrating ELEB1G Worship Day with us! Your photo strip is below, and attached so you can save it and share it.';
function safeColor(value, fallback) { return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback; }
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function buildMailHtml(theme = {}, event = {}) {
  const bg = safeColor(theme.ink, '#2c0e10'), panel = safeColor(theme.panel, bg), accent = safeColor(theme.accent, '#d63c30');
  const highlight = safeColor(theme.highlight, '#ff9d8a'), text = safeColor(theme.cream, '#fff1ea'), muted = safeColor(theme.muted, '#cdbcae');
  const border = safeColor(theme.accent, '#f4e8dd'), title = escapeHtml(event.title || 'Your photobooth pictures!');
  const details = [event.date, event.location].filter(Boolean).map(escapeHtml).join(' | ');
  const message = escapeHtml(event.message || MESSAGE);
  const verse = escapeHtml(event.verse || '“I have loved thee with an everlasting love.” Jeremiah 31:3');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background:${bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background:${bg};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="${panel}" style="max-width:560px;width:100%;background:${panel};border:1px solid ${border};border-radius:18px;overflow:hidden;">
<tr><td align="center" style="padding:22px 18px 16px;color:${text};font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;">${title}</td></tr>
<tr><td align="center" style="padding:0 16px 22px;"><img src="cid:banner" width="520" alt="Event banner" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;"></td></tr>
<tr><td align="center" style="padding:0 16px 24px;"><img src="cid:strip" width="380" alt="Your photo strip" style="display:block;width:380px;max-width:100%;height:auto;border:6px solid ${accent};border-radius:6px;"></td></tr>
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;color:${text};font-size:16px;line-height:1.55;padding:0 22px 18px;">${message}</td></tr>
<tr><td align="center" style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:${highlight};font-size:15px;padding:0 20px 24px;">${verse}</td></tr>
${details ? `<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;color:${muted};font-size:13px;border-top:1px solid ${border};padding:16px 18px;">${details}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
}
const tx = e.SMTP_HOST && nodemailer.createTransport({ host: e.SMTP_HOST, port: +e.SMTP_PORT || 587, auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } });

app.post('/api/frame', (q, r) => { try { fs.writeFileSync(path.join(D, 'frame.png'), b64(q.body.data)); r.json({ ok: 1 }); } catch (err) { r.status(500).json({ error: err.message }); } });

app.post('/api/session', (q, r) => {
  const { email, final, shots, theme, event } = q.body || {};
  if (!Array.isArray(shots) || shots.length < 1 || typeof final !== 'string' || !final.startsWith('data:image/')) {
    return r.status(400).json({ ok: 0, error: 'Missing photo data.' });
  }
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
  const temp = path.join(S, id + '.tmp'), d = path.join(S, id);
  try {
    fs.mkdirSync(temp);
    shots.forEach((s, i) => {
      if (typeof s !== 'string' || !s.startsWith('data:image/')) throw new Error('Invalid photo ' + (i + 1));
      fs.writeFileSync(path.join(temp, `shot${i + 1}.jpg`), b64(s));
    });
    fs.writeFileSync(path.join(temp, 'final.jpg'), b64(final));
    fs.writeFileSync(path.join(temp, 'session.json'), JSON.stringify({ email, status: email ? 'pending' : 'no-email', tries: 0, theme: theme || null, event: event || null }));
    fs.renameSync(temp, d); // Publish only after every image has been written.
    if (email) {
      try { fs.appendFileSync(path.join(S, 'emails.csv'), `${id},${email}\n`); }
      catch (csvErr) { console.warn('Photo session saved; email log could not be updated:', csvErr.message); }
    }
    r.json({ ok: 1, id });
    flush();
  } catch (err) {
    try { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true, force: true }); } catch {}
    console.error('Photo session save failed:', err);
    r.status(500).json({ ok: 0, error: 'Could not save this photo session.' });
  }
});

// Email queue: photos are saved first; unsent emails retry every 30s (handles bad venue Wi-Fi).
let busy = false;
async function flush() {
  if (!tx || busy) return; busy = true;
  for (const id of fs.readdirSync(S)) {
    const f = path.join(S, id, 'session.json'); if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f)); if (j.status !== 'pending') continue;
    try {
      await tx.sendMail({ from: e.MAIL_FROM, to: j.email, subject: e.MAIL_SUBJECT || 'Your photobooth pictures!',
        text: MESSAGE + '\n\nJeremiah 31:3 | Oct 24, 2PM | CCF Angono, Level 3, SM Center Angono', html: mailHtml,
        attachments: [
          { filename: 'photobooth.jpg', path: path.join(S, id, 'final.jpg'), cid: 'strip' },
          { filename: 'banner.png', path: path.join(P, 'img', 'banner.png'), cid: 'banner' }] });
      j.status = 'sent';
    } catch (err) { console.log('Email retry later:', err.message); if (++j.tries >= 20) j.status = 'failed'; }
    fs.writeFileSync(f, JSON.stringify(j));
  }
  busy = false;
}
if (tx) tx.verify().then(() => {
  console.log('Email login OK. Emails will be sent.');
  for (const id of fs.readdirSync(S)) { // retry sessions that failed earlier
    const f = path.join(S, id, 'session.json'); if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f)); if (j.status === 'failed') { j.status = 'pending'; j.tries = 0; fs.writeFileSync(f, JSON.stringify(j)); }
  }
  flush();
}).catch(err => console.log('EMAIL LOGIN PROBLEM:', err.message));
setInterval(flush, 30000);
app.get('/api/config', (q, r) => r.json({ email: !!tx }));
app.listen(3000, () => console.log('Photobooth running: http://localhost:3000' + (tx ? '' : '  (email NOT configured, see .env.example)')));
