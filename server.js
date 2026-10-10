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
const mailHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><style>:root{color-scheme:dark light;supported-color-schemes:dark light}body{background-color:#2c0e10!important}</style></head><body bgcolor="#2c0e10" style="margin:0;padding:0;background-color:#2c0e10;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#2c0e10" style="background-color:#2c0e10;background-image:linear-gradient(#2c0e10,#2c0e10);"><tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#2c0e10" style="max-width:560px;width:100%;background-color:#2c0e10;background-image:linear-gradient(#2c0e10,#2c0e10);">
<tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;padding-bottom:22px;"><img src="cid:banner" width="560" alt="ELEB1G Worship Day: Everlasting Love" style="display:block;width:100%;max-width:560px;height:auto;"></td></tr>
<tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;padding-bottom:24px;"><img src="cid:strip" width="380" alt="Your photo strip" style="display:block;width:380px;max-width:100%;height:auto;border:6px solid #f4e8dd;"></td></tr>
<tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;font-family:Arial,Helvetica,sans-serif;color:#f4e8dd;font-size:16px;line-height:1.55;padding:0 20px 18px;">${MESSAGE}</td></tr>
<tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#cdbcae;font-size:15px;padding-bottom:24px;">&ldquo;I have loved thee with an everlasting love.&rdquo; Jeremiah 31:3</td></tr>
<tr><td align="center" bgcolor="#2c0e10" style="background-color:#2c0e10;font-family:Arial,Helvetica,sans-serif;color:#a8978b;font-size:13px;border-top:1px solid #3a2a24;padding-top:16px;">Oct 24, 2PM | CCF Angono, Level 3, SM Center Angono</td></tr>
</table></td></tr></table></body></html>`;
const tx = e.SMTP_HOST && nodemailer.createTransport({ host: e.SMTP_HOST, port: +e.SMTP_PORT || 587, auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } });

app.post('/api/frame', (q, r) => { try { fs.writeFileSync(path.join(D, 'frame.png'), b64(q.body.data)); r.json({ ok: 1 }); } catch (err) { r.status(500).json({ error: err.message }); } });

app.post('/api/session', (q, r) => {
  const { email, final, shots } = q.body, id = new Date().toISOString().replace(/[:.]/g, '-'), d = path.join(S, id);
  fs.mkdirSync(d);
  shots.forEach((s, i) => fs.writeFileSync(path.join(d, `shot${i + 1}.jpg`), b64(s)));
  fs.writeFileSync(path.join(d, 'final.jpg'), b64(final));
  fs.writeFileSync(path.join(d, 'session.json'), JSON.stringify({ email, status: email ? 'pending' : 'no-email', tries: 0 }));
  if (email) fs.appendFileSync(path.join(S, 'emails.csv'), `${id},${email}\n`);
  r.json({ ok: 1 }); flush();
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
