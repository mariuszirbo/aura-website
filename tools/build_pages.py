#!/usr/bin/env python3
"""Bake static Romanian and English pages from src/ and js/i18n.js.

Romanian is the default at https://auralab.ro/.
English lives at https://auralab.ro/en/.
"""
import html
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://auralab.ro"
SRC = ROOT / "src"
DATE = "2026-11-17"
PAIRS = {
    "home": ("/", "/en/"),
    "privacy": ("/confidentialitate/", "/en/privacy/"),
    "terms": ("/termeni/", "/en/terms/"),
    "cookies": ("/cookie-uri/", "/en/cookies/"),
    "resellers": ("/revanzatori/", "/en/resellers/"),
}
TITLES = {
    "home": ("meta.title", "meta.description"),
    "privacy": ("privacy.title", "privacy.lead"),
    "terms": ("terms.title", "terms.lead"),
    "cookies": ("cookies.title", "cookies.lead"),
    "resellers": ("resellers.title", "resellers.lead"),
}


def load_i18n():
    script = (ROOT / "js" / "i18n.js").read_text()
    node = r"""
const vm = require('vm');
const fs = require('fs');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8').replace('const AURA_I18N', 'AURA_I18N') + '\nthis.OUT = AURA_I18N;', context);
process.stdout.write(JSON.stringify(context.OUT));
"""
    raw = subprocess.check_output(["node", "-e", node, str(ROOT / "js" / "i18n.js")])
    return json.loads(raw)


def lang_nav(code, ro_path, en_path):
    label = "Limbă" if code == "ro" else "Language"
    ro_current = ' aria-current="page"' if code == "ro" else ""
    en_current = ' aria-current="page"' if code == "en" else ""
    return (
        f'<nav class="lang" aria-label="{label}">'
        f'<a href="{ro_path}" hreflang="ro" lang="ro" data-keep-hash{ro_current}>RO</a>'
        f'<a href="{en_path}" hreflang="en" lang="en" data-keep-hash{en_current}>EN</a>'
        f"</nav>"
    )


def bake_text(page, t):
    def repl(match):
        key = match.group("key")
        if key not in t:
            raise SystemExit(f"missing key {key}")
        attrs = (match.group("attrs") + " " + match.group("attrs2")).strip()
        attrs = re.sub(r"\s+", " ", attrs)
        open_tag = f"<{match.group('tag')}"
        if attrs:
            open_tag += " " + attrs
        open_tag += ">"
        return open_tag + html.escape(t[key]) + f"</{match.group('tag')}>"

    page = re.sub(
        r"<(?P<tag>[\w:-]+)(?P<attrs>[^>]*?)\sdata-i18n=\"(?P<key>[^\"]+)\"(?P<attrs2>[^>]*)>(?P<inner>.*?)</(?P=tag)>",
        repl,
        page,
        flags=re.S,
    )

    def attr_repl(name, quote_attr):
        def sub(match):
            return f'{quote_attr}="{html.escape(t[match.group(1)], quote=True)}"'

        return re.sub(
            rf'data-i18n-{name}="([^"]+)"\s+{quote_attr}="[^"]*"',
            sub,
            page,
        )

    page = attr_repl("placeholder", "placeholder")
    page = attr_repl("alt", "alt")
    page = attr_repl("aria", "aria-label")
    if "data-i18n" in page:
        raise SystemExit("unresolved data-i18n remains")
    return page


def apply_pairs(page, code):
    slot = 0 if code == "ro" else 1
    for key, paths in PAIRS.items():
        page = page.replace(f'href="#pair-{key}"', f'href="{paths[slot]}"')
    if "#pair-" in page:
        raise SystemExit("unresolved pair link")
    return page


def rewrite_links(page, home, privacy):
    page = page.replace('href="index.html#', f'href="{home}#')
    page = page.replace('href="index.html"', f'href="{home}"')
    page = page.replace('href="privacy.html"', f'href="{privacy}"')
    page = re.sub(r'\sdata-lang-href="[^"]*"', "", page)
    for attr in ("href", "src", "srcset"):
        page = page.replace(f'{attr}="assets/', f'{attr}="/assets/')
        page = page.replace(f'{attr}="css/', f'{attr}="/css/')
        page = page.replace(f'{attr}="js/', f'{attr}="/js/')
    page = page.replace(
        'href="https://auralab-dev.lovable.app/auth"',
        'href="https://auralab-dev.lovable.app/auth" rel="noopener noreferrer" referrerpolicy="no-referrer"',
    )
    return page


def page_title(kind, t):
    title_key, desc_key = TITLES[kind]
    title = t[title_key] if kind == "home" else t[title_key] + " — A.U.R.A."
    return title, t[desc_key]


def head(code, kind, t):
    title, description = page_title(kind, t)
    ro_path, en_path = PAIRS[kind]
    path = ro_path if code == "ro" else en_path
    other = en_path if code == "ro" else ro_path
    og = "/assets/og-ro.png" if code == "ro" else "/assets/og-en.png"
    og_alt = (t["hero.before"] + t["hero.em"]) if kind == "home" else title
    canonical = ORIGIN + path
    other_url = ORIGIN + other
    locale = "ro_RO" if code == "ro" else "en_GB"
    other_locale = "en_GB" if code == "ro" else "ro_RO"
    home = ORIGIN + ("/" if code == "ro" else "/en/")
    graph = schema(code, kind, t, canonical, home, title, description)
    return f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description, quote=True)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="ro" href="{ORIGIN + ro_path}">
<link rel="alternate" hreflang="en" href="{ORIGIN + en_path}">
<link rel="alternate" hreflang="x-default" href="{ORIGIN + ro_path}">
<link rel="alternate" href="{other_url}" hreflang="{'en' if code == 'ro' else 'ro'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="A.U.R.A.">
<meta property="og:locale" content="{locale}">
<meta property="og:locale:alternate" content="{other_locale}">
<meta property="og:url" content="{canonical}">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(description, quote=True)}">
<meta property="og:image" content="{ORIGIN}{og}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(og_alt, quote=True)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(title, quote=True)}">
<meta name="twitter:description" content="{html.escape(description, quote=True)}">
<meta name="twitter:image" content="{ORIGIN}{og}">
<meta name="twitter:image:alt" content="{html.escape(og_alt, quote=True)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/favicon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/css/styles.css">
<link rel="alternate" type="text/plain" href="https://auralab.ro/llms.txt" title="LLM summary">
<script type="application/ld+json">{graph}</script>"""


def schema(code, kind, t, canonical, home, title, description):
    studies = [
        ("EP15-A3", t["study.ep15"], t["study.ep15.doc"]),
        (t["study.monitor.code"], t["study.monitor"], t["study.monitor.doc"]),
        ("EP09c", t["study.ep09"], t["study.ep09.doc"]),
        ("EP06", t["study.ep06"], t["study.ep06.doc"]),
        ("EP17", t["study.ep17"], t["study.ep17.doc"]),
        ("EP28", t["study.ep28"], t["study.ep28.doc"]),
        ("EP12", t["study.ep12"], t["study.ep12.doc"]),
        (t["study.eqa.code"], t["study.eqa"], t["study.eqa.doc"]),
    ]
    features = [
        t["product.01"] + " — " + t["product.01.b"],
        t["product.02"] + " — " + t["product.02.b"],
        t["product.03"],
        t["product.04"] + " — " + t["product.04.b"],
        t["product.05"],
        t["product.06"],
        t["product.07"],
    ]
    org_id = ORIGIN + "/#organization"
    site_id = ORIGIN + "/#website"
    app_id = ORIGIN + "/#software"
    graph = [
        {
            "@type": "Organization",
            "@id": org_id,
            "name": "A.U.R.A.",
            "url": ORIGIN + "/",
            "logo": ORIGIN + "/assets/aura-symbol.png",
            "email": "sales@auralab.ro",
            "contactPoint": {
                "@type": "ContactPoint",
                "email": "sales@auralab.ro",
                "contactType": "sales",
                "availableLanguage": ["Romanian", "English"],
            },
            "description": t["meta.description"],
        },
        {
            "@type": "WebSite",
            "@id": site_id,
            "url": ORIGIN + "/",
            "name": "A.U.R.A.",
            "inLanguage": ["ro", "en"],
            "publisher": {"@id": org_id},
        },
        {
            "@type": "SoftwareApplication",
            "@id": app_id,
            "name": "A.U.R.A.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "url": home,
            "inLanguage": code,
            "description": t["meta.description"],
            "featureList": features,
            "audience": {
                "@type": "Audience",
                "audienceType": t["roles.title"],
            },
            "provider": {"@id": org_id},
        },
        {
            "@type": "WebPage",
            "@id": canonical + "#webpage",
            "url": canonical,
            "name": title,
            "description": description,
            "inLanguage": code,
            "isPartOf": {"@id": site_id},
            "about": {"@id": app_id},
            "primaryImageOfPage": ORIGIN + ("/assets/og-ro.png" if code == "ro" else "/assets/og-en.png"),
            "dateModified": DATE,
        },
    ]
    if kind == "home":
        graph.append(
            {
                "@type": "ItemList",
                "@id": canonical + "#studies",
                "name": t["studies.title"],
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "name": f"{code_name} — {short}",
                        "description": doc,
                    }
                    for index, (code_name, short, doc) in enumerate(studies, start=1)
                ],
            }
        )
    else:
        graph.append(
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "A.U.R.A.", "item": home},
                    {"@type": "ListItem", "position": 2, "name": title, "item": canonical},
                ],
            }
        )
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))


def build_page(source, code, kind, t, home, privacy):
    ro_path, en_path = PAIRS[kind]
    page = source
    page = re.sub(r'<html lang="[^"]*">', f'<html lang="{code}">', page, count=1)
    page = re.sub(
        r'<div class="lang" role="group".*?</div>',
        lang_nav(code, ro_path, en_path),
        page,
        count=1,
        flags=re.S,
    )
    if kind in ("privacy", "terms", "cookies"):
        body = (SRC / "legal" / code / f"{kind}.html").read_text().strip()
        if "<!--LEGAL-->" not in page:
            raise SystemExit(f"missing legal slot for {kind}")
        page = page.replace("<!--LEGAL-->", body)
    page = bake_text(page, t)
    nav_label = "Principal" if code == "ro" else "Primary"
    page = page.replace('aria-label="Primary"', f'aria-label="{nav_label}"')
    page = page.replace(
        '<form id="contact-form" class="form-grid" method="post" action="mailto:sales@auralab.ro" enctype="text/plain">',
        '<form id="contact-form" class="form-grid" method="post" action="mailto:sales@auralab.ro" enctype="text/plain" data-mail-subject="'
        + html.escape(t["form.subject"], quote=True)
        + '" data-who-label="'
        + html.escape(t["form.who"], quote=True)
        + '">',
    )
    page = page.replace('<script src="js/i18n.js"></script>\n', "")
    page = apply_pairs(page, code)
    page = rewrite_links(page, home, privacy)
    page = re.sub(r"<head>.*?</head>", "<head>\n" + head(code, kind, t) + "\n</head>", page, count=1, flags=re.S)
    if kind == "home" and "<main" not in page:
        page = page.replace("</header>\n", "</header>\n<main>\n", 1)
        page = page.replace("<footer", "</main>\n<footer", 1)
    return page


def write_sitemap():
    pairs = [(ORIGIN + ro, ORIGIN + en) for ro, en in PAIRS.values()]
    urls = []
    for ro, en in pairs:
        for loc, alt_ro, alt_en, default in (
            (ro, ro, en, ro),
            (en, ro, en, ro),
        ):
            urls.append(
                f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{DATE}</lastmod>
    <xhtml:link rel="alternate" hreflang="ro" href="{alt_ro}"/>
    <xhtml:link rel="alternate" hreflang="en" href="{alt_en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{default}"/>
  </url>"""
            )
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
{urls}
</urlset>
""".format(urls="\n".join(urls))
    (ROOT / "sitemap.xml").write_text(xml)


def _gradient(size):
    from PIL import Image, ImageDraw
    image = Image.new("RGB", size, "#141728")
    draw = ImageDraw.Draw(image)
    width, height = size
    for x in range(width):
        blend = x / (width - 1)
        if blend < 0.52:
            mid = blend / 0.52
            color = (
                int(0x00 + (0x7E - 0x00) * mid),
                int(0x61 + (0x3C - 0x61) * mid),
                int(0xD8 + (0xCD - 0xD8) * mid),
            )
        else:
            mid = (blend - 0.52) / 0.48
            color = (
                int(0x7E + (0xF6 - 0x7E) * mid),
                int(0x3C + (0x5B - 0x3C) * mid),
                int(0xCD + (0x72 - 0xCD) * mid),
            )
        draw.line([(x, 0), (x, height)], fill=color)
    return image


def _trimmed_logo(path):
    from PIL import Image
    mark = Image.open(path).convert("RGBA")
    bbox = mark.split()[-1].point(lambda p: 255 if p > 12 else 0).getbbox()
    mark = mark.crop(bbox)
    side = max(mark.size)
    pad = int(side * 0.06)
    canvas_side = side + pad * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    canvas.paste(mark, ((canvas_side - mark.width) // 2, (canvas_side - mark.height) // 2), mark)
    return canvas


def _inter(weight):
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    folder = ROOT / "tools" / "fonts"
    source = folder / "InterTight-Variable.ttf"
    if not source.exists():
        return "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if weight >= 600 else "/System/Library/Fonts/Supplemental/Arial.ttf"
    target = folder / f"InterTight-{weight}.ttf"
    if not target.exists():
        font = TTFont(source)
        instantiateVariableFont(font, {"wght": weight}, inplace=False).save(target)
    return str(target)


def write_icons():
    try:
        from PIL import Image
    except ImportError:
        return
    master = _trimmed_logo(ROOT / "assets" / "aura-symbol.png")

    def sized(px, background=None):
        image = master.resize((px, px), Image.Resampling.LANCZOS)
        if background is None:
            return image
        base = Image.new("RGBA", (px, px), background)
        base.alpha_composite(image)
        return base

    sized(32).save(ROOT / "assets" / "favicon.png")
    sized(32).save(ROOT / "assets" / "favicon-32.png")
    sized(192).save(ROOT / "assets" / "favicon-192.png")
    sized(512).save(ROOT / "assets" / "favicon-512.png")
    sized(180, (255, 255, 255, 255)).save(ROOT / "assets" / "apple-touch-icon.png")
    sized(512).save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


def write_og_images():
    try:
        from PIL import Image, ImageDraw, ImageFilter, ImageFont
    except ImportError:
        return
    scale = 2
    width, height = 1200 * scale, 630 * scale
    logo = _trimmed_logo(ROOT / "assets" / "aura-symbol-white.png").resize((88 * scale, 88 * scale), Image.Resampling.LANCZOS)
    shot = Image.open(ROOT / "assets" / "hero-study.webp").convert("RGB")
    photo_w, photo_h = 560 * scale, int(560 * scale * shot.height / shot.width)
    shot = shot.resize((photo_w, photo_h), Image.Resampling.LANCZOS)
    font_mark = ImageFont.truetype(_inter(700), 58 * scale)
    font_body = ImageFont.truetype(_inter(560), 32 * scale)
    font_kicker = ImageFont.truetype(_inter(500), 18 * scale)
    cards = {
        "og-ro.png": ("De la IFU la un raport", "pregătit pentru audit.", "ISO 15189:2022  ·  Procese de examinare"),
        "og-en.png": ("From IFU to an", "audit-ready report.", "ISO 15189:2022  ·  Examination processes"),
    }
    for name, (line1, line2, kicker) in cards.items():
        image = _gradient((width, height)).convert("RGBA")
        card_x, card_y = 588 * scale, (630 * scale - photo_h) // 2
        shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            (card_x, card_y + 18 * scale, card_x + photo_w, card_y + photo_h + 18 * scale),
            radius=28 * scale,
            fill=(24, 21, 53, 110),
        )
        image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22 * scale)))
        mask = Image.new("L", shot.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo_w - 1, photo_h - 1), radius=22 * scale, fill=255)
        framed = Image.new("RGBA", shot.size, (255, 255, 255, 255))
        framed.paste(shot, (0, 0))
        image.paste(framed, (card_x, card_y), mask)
        image.paste(logo, (64 * scale, 168 * scale), logo)
        draw = ImageDraw.Draw(image)
        draw.text((64 * scale, 276 * scale), "A.U.R.A.", font=font_mark, fill="white")
        draw.text((64 * scale, 372 * scale), line1, font=font_body, fill="white")
        draw.text((64 * scale, 418 * scale), line2, font=font_body, fill="white")
        draw.text((64 * scale, 492 * scale), kicker, font=font_kicker, fill=(255, 255, 255, 230))
        draw.text((64 * scale, 548 * scale), "auralab.ro", font=font_kicker, fill=(255, 255, 255, 210))
        image.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS).save(ROOT / "assets" / name, "PNG", optimize=True)


def main():
    SRC.mkdir(exist_ok=True)
    if not (SRC / "index.html").exists():
        shutil.copy(ROOT / "index.html", SRC / "index.html")
        shutil.copy(ROOT / "privacy.html", SRC / "privacy.html")
    i18n = load_i18n()
    home_src = (SRC / "index.html").read_text()
    legal_src = (SRC / "legal.html").read_text()
    pages = {
        ROOT / "index.html": build_page(home_src, "ro", "home", i18n["ro"], "/", "/confidentialitate/"),
        ROOT / "en" / "index.html": build_page(home_src, "en", "home", i18n["en"], "/en/", "/en/privacy/"),
        ROOT / "revanzatori" / "index.html": build_page((SRC / "resellers.html").read_text(), "ro", "resellers", i18n["ro"], "/", "/confidentialitate/"),
        ROOT / "en" / "resellers" / "index.html": build_page((SRC / "resellers.html").read_text(), "en", "resellers", i18n["en"], "/en/", "/en/privacy/"),
    }
    for kind in ("privacy", "terms", "cookies"):
        ro_path, en_path = PAIRS[kind]
        pages[ROOT / ro_path.strip("/") / "index.html"] = build_page(
            legal_src, "ro", kind, i18n["ro"], "/", PAIRS["privacy"][0]
        )
        pages[ROOT / en_path.strip("/") / "index.html"] = build_page(
            legal_src, "en", kind, i18n["en"], "/en/", PAIRS["privacy"][1]
        )
    for path, content in pages.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        print(path.relative_to(ROOT), len(content))
    stub = """<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://auralab.ro/confidentialitate/">
<meta http-equiv="refresh" content="0; url=/confidentialitate/">
<title>Confidențialitate — A.U.R.A.</title>
</head>
<body>
<p><a href="/confidentialitate/">Confidențialitate</a> · <a href="/en/privacy/">Privacy</a></p>
</body>
</html>
"""
    (ROOT / "privacy.html").write_text(stub)
    write_sitemap()
    write_icons()
    write_og_images()


if __name__ == "__main__":
    main()
