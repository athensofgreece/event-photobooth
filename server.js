const express = require('express'), fs = require('fs'), path = require('path'), nodemailer = require('nodemailer'), crypto = require('crypto');
const app = express(), S = path.join(__dirname, 'sessions'), P = path.join(__dirname, 'public');
fs.mkdirSync(S, { recursive: true });
// Basic security headers. This booth is intended for trusted local-network use.
app.use((q, r, next) => {
  r.setHeader('X-Content-Type-Options', 'nosniff');
  r.setHeader('X-Frame-Options', 'DENY');
  r.setHeader('Referrer-Policy', 'no-referrer');
  r.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  r.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
const requestLimits = new Map();
// Prune expired entries so repeated clients cannot grow this map indefinitely.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestLimits) if (now - entry.start >= 10 * 60 * 1000) requestLimits.delete(key);
}, 5 * 60 * 1000).unref();
function rateLimit(key, max, windowMs) {
  return (q, r, next) => {
    const now = Date.now(), entry = requestLimits.get(key + (q.ip || q.socket.remoteAddress));
    if (!entry || now - entry.start >= windowMs) {
      requestLimits.set(key + (q.ip || q.socket.remoteAddress), { start: now, count: 1 });
      return next();
    }
    if (entry.count >= max) return r.status(429).json({ ok: 0, error: 'Too many requests. Please wait and try again.' });
    entry.count++;
    next();
  };
}
app.use(express.json({ limit: '100mb' }));
const D = path.join(__dirname, 'data'); fs.mkdirSync(D, { recursive: true });
const CUSTOM_FRAME = path.join(D, 'custom-frame.png'), TRACKED_FRAME = path.join(D, 'frame.png');
// Preserve only a locally modified frame as an ignored override; leave the tracked default untouched.
if (!fs.existsSync(CUSTOM_FRAME) && fs.existsSync(TRACKED_FRAME)) {
  try {
    const bytes = fs.readFileSync(TRACKED_FRAME), gitHash = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
    if (gitHash !== 'cc9fdff2ee48a67300200433183e5c9f658c177a') fs.copyFileSync(TRACKED_FRAME, CUSTOM_FRAME);
  } catch (err) { console.warn('Local frame migration skipped:', err.message); }
}

app.get('/frame.png', (q, r) => { const d0 = path.join(P, 'img', 'default-frame.png'); fs.existsSync(CUSTOM_FRAME) ? r.sendFile(CUSTOM_FRAME) : fs.existsSync(TRACKED_FRAME) ? r.sendFile(TRACKED_FRAME) : fs.existsSync(d0) ? r.sendFile(d0) : r.sendStatus(404); });
app.use(express.static(P));
const b64 = d => Buffer.from(d.split(',')[1], 'base64');
const e = process.env;


// ---- EDIT YOUR EMAIL MESSAGE HERE ----
const MESSAGE = 'Thank you for celebrating B1G Christmas Party 2026 with us! Your photo strip is below, and attached so you can save it and share it.';
function safeColor(value, fallback) { return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback; }
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function buildMailHtml(theme = {}, event = {}) {
  const bg = safeColor(theme.ink, '#2c0e10'), panel = safeColor(theme.panel, bg), accent = safeColor(theme.accent, '#d63c30');
  const highlight = safeColor(theme.highlight, '#ff9d8a'), text = safeColor(theme.cream, '#fff1ea'), muted = safeColor(theme.muted, '#cdbcae');
  const border = safeColor(theme.accent, '#f4e8dd'), title = escapeHtml(event.title || 'Your photobooth pictures!');
  const details = [event.date, event.location].filter(Boolean).map(escapeHtml).join(' | ');
  const message = escapeHtml(event.message || MESSAGE);
  const verse = escapeHtml(event.verse || '“The true light that gives light to everyone was coming into the world.” John 1:9');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background:${bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background:${bg};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="${panel}" style="max-width:560px;width:100%;background:${panel};border:1px solid ${border};border-radius:18px;overflow:hidden;">
<tr><td align="center" style="padding:22px 18px 16px;color:${text};font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;">${title}</td></tr>
<tr><td align="center" style="padding:0 16px 24px;"><img src="cid:strip" width="380" alt="Your photo strip" style="display:block;width:380px;max-width:100%;height:auto;border:6px solid ${accent};border-radius:6px;"></td></tr>
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;color:${text};font-size:16px;line-height:1.55;padding:0 22px 18px;">${message}</td></tr>
<tr><td align="center" style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:${highlight};font-size:15px;padding:0 20px 24px;">${verse}</td></tr>
${details ? `<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;color:${muted};font-size:13px;border-top:1px solid ${border};padding:16px 18px;">${details}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
}
const tx = e.SMTP_HOST && nodemailer.createTransport({ host: e.SMTP_HOST, port: +e.SMTP_PORT || 587, auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } });

app.post('/api/frame', rateLimit('frame:', 5, 60 * 1000), (q, r) => {
  const data = q.body?.data;
  if (typeof data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > 8 * 1024 * 1024 || !b64(data).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ) {
    return r.status(400).json({ ok: 0, error: 'Invalid PNG frame or file is too large (8 MB maximum).' });
  }
  try { fs.writeFileSync(CUSTOM_FRAME, b64(data)); r.json({ ok: 1 }); }
  catch (err) { console.error('Frame upload failed:', err); r.status(500).json({ ok: 0, error: 'Could not save the frame.' }); }
});

app.post('/api/session', rateLimit('session:', 12, 5 * 60 * 1000), (q, r) => {
  const { email, final, shots, theme, event } = q.body || {};
  if (email && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return r.status(400).json({ ok: 0, error: 'Please enter a valid email address.' });
  }
  const payloadBytes = Buffer.byteLength(JSON.stringify(q.body || {}));
  console.log(`Photo save request: ${payloadBytes} bytes; shots=${Array.isArray(shots) ? shots.length : 'invalid'}; final=${typeof final === 'string' ? final.length : 'missing'} chars`);
  const imagePattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  const validImage = (value, maxBytes = 12 * 1024 * 1024) => {
    if (typeof value !== 'string' || !imagePattern.test(value) || Buffer.byteLength(value, 'utf8') > maxBytes || b64(value).length > maxBytes) return false;
    const bytes = b64(value);
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  };
  if (!Array.isArray(shots) || shots.length < 1 || shots.length > 10 || !validImage(final) || shots.some(s => !validImage(s))) {
    console.warn('Photo save validation failed: image data missing, invalid, too large, or shot count is outside 1–10');
    return r.status(400).json({ ok: 0, error: 'Invalid photo data. Between 1 and 10 images and a final strip are required; each must be under 12 MB.' });
  }
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
  const temp = path.join(S, id + '.tmp'), d = path.join(S, id);
  try {
    fs.mkdirSync(temp);
    shots.forEach((s, i) => {
      fs.writeFileSync(path.join(temp, `shot${i + 1}.jpg`), b64(s));
    });
    fs.writeFileSync(path.join(temp, 'final.jpg'), b64(final));
    fs.writeFileSync(path.join(temp, 'session.json'), JSON.stringify({ email, status: email ? 'pending' : 'no-email', tries: 0, theme: theme || null, event: event || null }));
    fs.renameSync(temp, d); // Publish only after every image has been written.
    if (email) {
      try { fs.appendFileSync(path.join(S, 'emails.csv'), `${id},"${String(email).replace(/"/g, '""')}"
`); }
      catch (csvErr) { console.warn('Photo session saved; email log could not be updated:', csvErr.message); }
    }
    console.log(`Photo session saved successfully: ${id} (${shots.length} shots)`);
    r.json({ ok: 1, id });
    flush();
  } catch (err) {
    try { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true, force: true }); } catch {}
    console.error('Photo session save failed:', err.stack || err);
    r.status(500).json({ ok: 0, error: err.code || err.message || 'Could not save this photo session.' });
  }
});

// Email queue: photos are saved first; unsent emails retry every 30s (handles bad venue Wi-Fi).
let busy = false;
async function flush() {
  if (!tx || busy) return; busy = true;
  try {
    for (const id of fs.readdirSync(S)) {
      const f = path.join(S, id, 'session.json'); if (!fs.existsSync(f)) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
      catch (readErr) { console.warn('Skipping unreadable email queue entry:', id, readErr.message); continue; }
      if (j.status !== 'pending') continue;
      try {
        await tx.sendMail({ from: e.MAIL_FROM, to: j.email, subject: e.MAIL_SUBJECT || 'Your photobooth pictures!',
          text: MESSAGE + (j.event?.date || j.event?.location ? '\n\n' + [j.event.date, j.event.location].filter(Boolean).join(' | ') : '\n\nJohn 1:9'), html: buildMailHtml(j.theme || {}, j.event || {}),
          attachments: [
            { filename: 'photobooth.jpg', path: path.join(S, id, 'final.jpg'), cid: 'strip' },] });
        j.status = 'sent';
      } catch (err) { console.log('Email retry later:', err.message); if (++j.tries >= 20) j.status = 'failed'; }
      try { fs.writeFileSync(f, JSON.stringify(j)); }
      catch (writeErr) { console.warn('Email queue status could not be saved:', id, writeErr.message); }
    }
  } catch (err) { console.error('Email queue processing failed:', err.message); }
  finally { busy = false; }
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
app.use((err, q, r, next) => {
  if (r.headersSent) return next(err);
  console.error('Photobooth request error:', err.stack || err);
  if (err.type === 'entity.too.large' || err.status === 413) return r.status(413).json({ ok: 0, error: 'Upload too large. Request exceeds the 100 MB limit.' });
  if (err.type === 'entity.parse.failed' || err.status === 400) return r.status(400).json({ ok: 0, error: 'Invalid request JSON.' });
  r.status(err.status || 500).json({ ok: 0, error: err.message || 'Request failed.' });
});
app.listen(3000, () => console.log('Photobooth running: http://localhost:3000' + (tx ? '' : '  (email NOT configured, see .env.example)')));
