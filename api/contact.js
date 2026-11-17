const TO = "sales@auralab.ro";
const FROM = "A.U.R.A. <sales@auralab.ro>";
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
    res.status(200).json({ ok: true });
    return;
  }

  const email = oneLine(body.email, 200);
  const name = oneLine(body.name, 200);
  const text = String(body.text || "").replace(/\u0000/g, "").trim().slice(0, 8000);
  const requestedSubject = oneLine(body.subject, 200);
  const subject = SUBJECTS[requestedSubject] ? requestedSubject : "A.U.R.A. — website request";

  if (!name || !text || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    res.status(400).json({ ok: false });
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ ok: false });
    return;
  }

  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: subject,
        text: text + "\n\n—\nSent from the auralab.ro website. Reply goes to the address above."
      })
    });
    if (!sent.ok) {
      res.status(502).json({ ok: false });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(502).json({ ok: false });
  }
};
