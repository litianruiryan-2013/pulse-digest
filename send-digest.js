// ─────────────────────────────────────────────────────────────────────────
//  send-digest.js  —  Free daily news digest emailer
//
//  Fetches headlines from public RSS feeds (no key needed) and emails them
//  to you via Resend (free tier: 100 emails/day, 3,000/month).
//
//  Runs on a schedule via GitHub Actions — see .github/workflows/daily.yml
//
//  The ONLY secret needed is RESEND_API_KEY, stored in GitHub repo secrets.
//  Your destination email is set as TO_EMAIL (also a secret or env var).
// ─────────────────────────────────────────────────────────────────────────

// Categories → public RSS feeds (all free)
const FEEDS = {
  "Top Stories": [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.npr.org/1001/rss.xml",
  ],
  "World": [
    "https://www.aljazeera.com/xml/rss/all.xml",
  ],
  "Technology": [
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "https://www.theverge.com/rss/index.xml",
  ],
  "Business": [
    "https://feeds.bbci.co.uk/news/business/rss.xml",
  ],
  "Science": [
    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  ],
};

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
const PER_SECTION = 5; // headlines per category

function stripTags(s) {
  return (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Minimal RSS/XML parser — used as a fallback if the JSON proxy is unavailable.
function parseRss(xml) {
  const items = [];
  const blocks = xml.split(/<item[ >]/).slice(1);
  for (const block of blocks) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    };
    const title = get("title");
    if (!title) continue;
    items.push({
      title,
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

async function fetchFeed(url) {
  // Try the JSON proxy first (clean, structured).
  try {
    const res = await fetch(RSS2JSON + encodeURIComponent(url));
    const data = await res.json();
    if (data && Array.isArray(data.items) && data.items.length) return data.items;
  } catch {
    /* fall through to direct fetch */
  }
  // Fallback: fetch the raw RSS and parse it ourselves.
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PulseDigest/1.0" } });
    const xml = await res.text();
    return parseRss(xml);
  } catch {
    return [];
  }
}

async function buildDigest() {
  const sections = [];

  for (const [cat, urls] of Object.entries(FEEDS)) {
    const all = (await Promise.all(urls.map(fetchFeed))).flat();
    // newest first, dedupe by title
    const seen = new Set();
    const items = all
      .filter((i) => i.title && !seen.has(i.title) && seen.add(i.title))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, PER_SECTION);
    if (items.length) sections.push({ cat, items });
  }

  return sections;
}

function renderHtml(sections) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const sectionHtml = sections.map((s) => `
    <tr><td style="padding:26px 0 10px;">
      <div style="font:600 13px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:1.5px;
                  text-transform:uppercase;color:#ff5c38;">${s.cat}</div>
    </td></tr>
    ${s.items.map((it) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #eceff3;">
      <a href="${it.link}" style="text-decoration:none;color:#10172a;">
        <div style="font:600 17px/1.4 Georgia,serif;margin-bottom:5px;">${stripTags(it.title)}</div>
        <div style="font:400 13.5px/1.55 'Helvetica Neue',Arial,sans-serif;color:#697489;">
          ${stripTags(it.description).slice(0, 150)}…
        </div>
      </a>
    </td></tr>`).join("")}
  `).join("");

  return `
  <div style="background:#f4f6fa;padding:30px 0;">
    <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"
           style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;
                  overflow:hidden;box-shadow:0 4px 30px rgba(10,31,68,.07);">
      <tr><td style="background:linear-gradient(120deg,#ff5c38,#ffb13d);padding:30px 32px;">
        <div style="font:700 30px/1 Georgia,serif;color:#fff;letter-spacing:-1px;">PULSE</div>
        <div style="font:500 12px/1 'Helvetica Neue',Arial;color:rgba(255,255,255,.9);
                    letter-spacing:1.5px;text-transform:uppercase;margin-top:6px;">
          Your daily world digest
        </div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <div style="font:400 14px/1 'Helvetica Neue',Arial;color:#697489;">${today}</div>
      </td></tr>
      <tr><td style="padding:0 32px;"><table width="100%" cellpadding="0" cellspacing="0">
        ${sectionHtml}
      </table></td></tr>
      <tr><td style="padding:26px 32px 30px;text-align:center;">
        <div style="font:400 12px/1.6 'Helvetica Neue',Arial;color:#8b94a7;">
          Pulled live from public news feeds. Tap any headline to read the full story.<br/>
          You're getting this because you set up PULSE daily digest.
        </div>
      </td></tr>
    </table>
  </div>`;
}

async function main() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.TO_EMAIL;
  // Resend lets you send from onboarding@resend.dev for free testing,
  // or your own verified domain. Default keeps it zero-setup.
  const FROM_EMAIL = process.env.FROM_EMAIL || "PULSE <onboarding@resend.dev>";

  if (!RESEND_API_KEY || !TO_EMAIL) {
    console.error("Missing RESEND_API_KEY or TO_EMAIL. Set them as GitHub repo secrets.");
    process.exit(1);
  }

  console.log("Fetching news feeds…");
  const sections = await buildDigest();
  if (!sections.length) {
    console.error("No stories fetched — feeds may be temporarily down. Skipping send.");
    process.exit(0);
  }

  const html = renderHtml(sections);
  const subject = `📰 Your daily digest — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  console.log("Sending email via Resend…");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", res.status, err);
    process.exit(1);
  }

  console.log("✅ Digest sent successfully to", TO_EMAIL);
}

main();
