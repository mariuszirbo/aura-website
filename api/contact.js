const TO = "sales@auralab.ro";
const FROM = "Support Team <support@auralab.ro>";
const LOGO = "https://www.auralab.ro/assets/aura-symbol.png";
const SUBJECTS = {
  "A.U.R.A. — demo request": true,
  "A.U.R.A. — cerere de demonstrație": true,
  "A.U.R.A. — licence estimate": true,
  "A.U.R.A. — estimare licență": true,
  "A.U.R.A. — technical presentation": true,
  "A.U.R.A. — prezentare tehnică": true
};

function oneLine(value, max) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowsFromText(text) {
  const rows = [];
  String(text).split("\n").forEach(function (line) {
    const cut = line.indexOf(": ");
    if (cut > 0 && cut < 80) rows.push({ label: line.slice(0, cut), value: line.slice(cut + 2) });
    else if (rows.length && line) rows[rows.length - 1].value += "\n" + line;
  });
  return rows;
}

function valueHtml(value) {
  const safe = escapeHtml(value).replace(/\n/g, "<br>");
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim())) {
    return '<a href="mailto:' + escapeHtml(value.trim()) + '" style="color:#5f4adb;text-decoration:none;">' + safe + "</a>";
  }
  return safe;
}

function frame(title, body, footer) {
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f6fa;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">' +
    '<tr><td width="34%" style="background:#0061d8;height:4px;font-size:0;line-height:0;">&nbsp;</td>' +
    '<td width="33%" style="background:#7e3ccd;height:4px;font-size:0;line-height:0;">&nbsp;</td>' +
    '<td width="33%" style="background:#f65b72;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>' +
    '<tr><td colspan="3" style="padding:28px 32px 0;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="vertical-align:middle;"><img src="' + LOGO + '" width="40" height="39" alt="A.U.R.A." style="display:block;border:0;"></td>' +
    '<td style="vertical-align:middle;padding-left:12px;font:600 15px/1 Arial,Helvetica,sans-serif;letter-spacing:4px;color:#141728;">AURA</td>' +
    "</tr></table></td></tr>" +
    '<tr><td colspan="3" style="padding:22px 32px 0;font:600 22px/1.3 Arial,Helvetica,sans-serif;color:#141728;">' + escapeHtml(title) + "</td></tr>" +
    '<tr><td colspan="3" style="padding:16px 32px 28px;font:400 16px/1.5 Arial,Helvetica,sans-serif;color:#141728;">' + body + "</td></tr>" +
    '<tr><td colspan="3" style="padding:16px 32px 22px;background:#f5f6fa;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#65677a;">' + footer + "</td></tr>" +
    "</table></td></tr></table></body></html>";
}

function salesMail(text, lang) {
  const ro = lang === "ro";
  const rows = rowsFromText(text).map(function (row) {
    return '<tr><td style="padding:12px 0;border-top:1px solid #e0e1e8;font:500 13px/1.4 Arial,Helvetica,sans-serif;color:#65677a;width:148px;vertical-align:top;">' +
      escapeHtml(row.label) + "</td>" +
      '<td style="padding:12px 0;border-top:1px solid #e0e1e8;font:400 15px/1.45 Arial,Helvetica,sans-serif;color:#141728;vertical-align:top;">' +
      valueHtml(row.value) + "</td></tr>";
  }).join("");
  const footer = ro
    ? "Răspundeți la acest mesaj pentru a scrie expeditorului. Trimis de pe site-ul auralab.ro."
    : "Reply to this message to reach the sender. Sent from the auralab.ro website.";
  return {
    html: frame(ro ? "Solicitare de pe site" : "Request from the website", '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + "</table>", footer),
    text: text + "\n\n—\n" + footer
  };
}

function confirmation(lang, name, subject) {
  const ro = lang === "ro";
  let about = ro ? "mesajul dumneavoastră" : "your message";
  if (subject.indexOf("estim") !== -1) about = ro ? "estimarea de licență" : "your licence estimate";
  if (subject.indexOf("prezent") !== -1 || subject.indexOf("presentation") !== -1) about = ro ? "cererea de prezentare tehnică" : "your request for the technical presentation";
  const safeName = escapeHtml(name);
  if (ro) {
    const body = "Bună ziua, " + safeName + ",<br><br>Am primit " + about + " trimis de pe auralab.ro. Nu este o comandă. Echipa comercială va răspunde de la <a href=\"mailto:sales@auralab.ro\" style=\"color:#5f4adb;text-decoration:none;\">sales@auralab.ro</a>.<br><br>Dacă nu ați trimis dumneavoastră acest mesaj, îl puteți ignora.";
    return {
      subject: "A.U.R.A. — am primit mesajul dumneavoastră",
      text: "Bună ziua, " + name + ",\n\nAm primit " + about + " trimis de pe auralab.ro. Nu este o comandă. Echipa comercială va răspunde de la sales@auralab.ro.\n\nDacă nu ați trimis dumneavoastră acest mesaj, îl puteți ignora.\n\nEchipa de suport\nsupport@auralab.ro",
      html: frame("Am primit mesajul dumneavoastră", body, "Echipa de suport · support@auralab.ro")
    };
  }
  const body = "Hello " + safeName + ",<br><br>We received " + about + " from auralab.ro. It is not an order. The commercial team will reply from <a href=\"mailto:sales@auralab.ro\" style=\"color:#5f4adb;text-decoration:none;\">sales@auralab.ro</a>.<br><br>If you did not send this message, you can ignore this email.";
  return {
    subject: "A.U.R.A. — we received your message",
    text: "Hello " + name + ",\n\nWe received " + about + " from auralab.ro. It is not an order. The commercial team will reply from sales@auralab.ro.\n\nIf you did not send this message, you can ignore this email.\n\nSupport Team\nsupport@auralab.ro",
    html: frame("We received your message", body, "Support Team · support@auralab.ro")
  };
}

async function deliver(payload) {
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return sent.ok;
}

function allowedOrigin(req) {
  const origin = req.headers.origin || "";
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "auralab.ro" || host === "www.auralab.ro" || host === "localhost" || host === "127.0.0.1";
  } catch (error) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false });
    return;
  }
  if (!allowedOrigin(req)) {
    res.status(403).json({ ok: false });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (oneLine(body.hp_field, 200)) {
    res.status(200).json({ ok: true, confirmed: true });
    return;
  }

  const email = oneLine(body.email, 200);
  const name = oneLine(body.name, 200);
  const text = String(body.text || "").replace(/\u0000/g, "").trim().slice(0, 8000);
  const requestedSubject = oneLine(body.subject, 200);
  const subject = SUBJECTS[requestedSubject] ? requestedSubject : "A.U.R.A. — website request";
  const lang = body.lang === "ro" ? "ro" : "en";

  if (!name || !text || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    res.status(400).json({ ok: false });
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ ok: false });
    return;
  }

  try {
    const sales = salesMail(text, lang);
    const sent = await deliver({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: subject,
      text: sales.text,
      html: sales.html
    });
    if (!sent) {
      res.status(502).json({ ok: false });
      return;
    }
    const note = confirmation(lang, name, subject);
    const confirmed = await deliver({
      from: FROM,
      to: [email],
      reply_to: TO,
      subject: note.subject,
      text: note.text,
      html: note.html
    });
    res.status(200).json({ ok: true, confirmed: confirmed });
  } catch (error) {
    res.status(502).json({ ok: false });
  }
};
