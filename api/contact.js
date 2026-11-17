const TO = "sales@auralab.ro";
const FROM = "A.U.R.A. <sales@auralab.ro>";
const CONFIRM_FROM = "A.U.R.A. <noreply@auralab.ro>";
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

function confirmation(lang, name, subject) {
  const ro = lang === "ro";
  let about = ro ? "mesajul dumneavoastră" : "your message";
  if (subject.indexOf("estim") !== -1) about = ro ? "estimarea de licență" : "your licence estimate";
  if (subject.indexOf("prezent") !== -1 || subject.indexOf("presentation") !== -1) about = ro ? "cererea de prezentare tehnică" : "your request for the technical presentation";
  if (ro) {
    return {
      subject: "A.U.R.A. — am primit mesajul dumneavoastră",
      text: "Bună ziua, " + name + ",\n\nAm primit " + about + " trimis de pe auralab.ro. Nu este o comandă. Echipa comercială va răspunde de la sales@auralab.ro.\n\nDacă nu ați trimis dumneavoastră acest mesaj, îl puteți ignora.\n\nA.U.R.A.\nnoreply@auralab.ro"
    };
  }
  return {
    subject: "A.U.R.A. — we received your message",
    text: "Hello " + name + ",\n\nWe received " + about + " from auralab.ro. It is not an order. The commercial team will reply from sales@auralab.ro.\n\nIf you did not send this message, you can ignore this email.\n\nA.U.R.A.\nnoreply@auralab.ro"
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
    const sent = await deliver({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: subject,
      text: text + "\n\n—\nSent from the auralab.ro website. Reply goes to the address above."
    });
    if (!sent) {
      res.status(502).json({ ok: false });
      return;
    }
    const note = confirmation(lang, name, subject);
    const confirmed = await deliver({
      from: CONFIRM_FROM,
      to: [email],
      reply_to: TO,
      subject: note.subject,
      text: note.text
    });
    res.status(200).json({ ok: true, confirmed: confirmed });
  } catch (error) {
    res.status(502).json({ ok: false });
  }
};
