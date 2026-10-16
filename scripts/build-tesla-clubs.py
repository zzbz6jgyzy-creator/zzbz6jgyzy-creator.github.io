#!/usr/bin/env python3
"""Build the public Tesla owners-club directory from a publication audit.

Only CLUB / CHAPTER / COMMUNITY tiers ship. Historical, duplicate and
unresolved HOLD records stay out of the public listing.
"""
from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_SRC = pathlib.Path(
    "/home/ubuntu/.cursor/projects/workspace/uploads/tesla_clubs_publication_audit_2026_10_16_e18a.json"
)

PUBLIC_PREFIX = ("CLUB —", "CHAPTER —", "COMMUNITY —")

COUNTRY_LL = {
    "Australia": (-25.27, 133.78),
    "Austria": (47.52, 14.55),
    "Belgium": (50.50, 4.47),
    "Brazil": (-14.24, -51.93),
    "Bulgaria": (42.73, 25.49),
    "Canada": (56.13, -106.35),
    "Chile": (-35.68, -71.54),
    "Colombia": (4.57, -74.30),
    "Czechia": (49.82, 15.47),
    "Denmark": (56.26, 9.50),
    "France": (46.23, 2.21),
    "Germany": (51.17, 10.45),
    "Hong Kong & Macau": (22.32, 114.17),
    "Hungary": (47.16, 19.50),
    "India": (20.59, 78.96),
    "Ireland": (53.14, -7.69),
    "Israel": (31.05, 34.85),
    "Italy": (41.87, 12.57),
    "Japan": (36.20, 138.25),
    "Malaysia": (4.21, 101.98),
    "Mexico": (23.63, -102.55),
    "Netherlands": (52.13, 5.29),
    "New Zealand": (-40.90, 174.89),
    "Norway": (60.47, 8.47),
    "Philippines": (12.88, 121.77),
    "Poland": (51.92, 19.15),
    "Portugal": (39.40, -8.22),
    "Romania": (45.94, 24.97),
    "Serbia": (44.02, 21.01),
    "Singapore": (1.35, 103.82),
    "Slovakia": (48.67, 19.70),
    "Slovenia": (46.15, 14.99),
    "South Korea": (35.91, 127.77),
    "Spain": (40.46, -3.75),
    "Sweden": (60.13, 18.64),
    "Switzerland": (46.82, 8.23),
    "Taiwan": (23.70, 121.00),
    "Thailand": (15.87, 100.99),
    "Türkiye": (38.96, 35.24),
    "United Arab Emirates": (23.42, 53.85),
    "United Kingdom": (54.00, -2.55),
    "United States": (39.83, -98.58),
}

REGION_LL = {
    ("Australia", "Australian Capital Territory"): (-35.28, 149.13),
    ("Australia", "New South Wales"): (-31.25, 146.92),
    ("Australia", "Northern Territory"): (-19.49, 132.55),
    ("Australia", "Queensland"): (-22.58, 144.25),
    ("Australia", "South Australia"): (-30.00, 136.21),
    ("Australia", "Tasmania"): (-42.04, 146.81),
    ("Australia", "Victoria"): (-36.98, 144.77),
    ("Australia", "Western Australia"): (-25.04, 121.63),
    ("Canada", "Alberta"): (53.93, -116.58),
    ("Canada", "Atlantic Canada"): (46.50, -63.50),
    ("Canada", "British Columbia"): (53.73, -127.65),
    ("Canada", "Greater Toronto Area, Ontario"): (43.70, -79.42),
    ("Canada", "Ontario"): (50.00, -85.00),
    ("Canada", "Quebec"): (52.94, -73.55),
    ("Canada", "Saskatchewan"): (52.94, -106.45),
    ("Chile", "National"): (-33.45, -70.67),
    ("France", "Alsace"): (48.32, 7.44),
    ("France", "Antilles"): (16.25, -61.53),
    ("France", "Auvergne-Rhône-Alpes"): (45.45, 4.39),
    ("France", "Bourgogne-Franche-Comté"): (47.05, 5.05),
    ("France", "Bretagne"): (48.20, -2.93),
    ("France", "Centre-Val de Loire"): (47.75, 1.68),
    ("France", "Champagne-Ardenne"): (48.96, 4.36),
    ("France", "Hauts-de-France"): (50.48, 2.79),
    ("France", "Languedoc-Roussillon"): (43.59, 3.26),
    ("France", "Lorraine / Grand Est"): (48.70, 6.18),
    ("France", "Midi-Pyrénées"): (43.60, 1.44),
    ("France", "Normandie"): (49.18, 0.37),
    ("France", "Nouvelle-Aquitaine"): (45.38, 0.45),
    ("France", "PACA"): (43.94, 6.06),
    ("France", "Pays de la Loire"): (47.48, -0.79),
    ("France", "Réunion"): (-21.12, 55.54),
    ("France", "Île-de-France"): (48.86, 2.35),
    ("Italy", "Abruzzo"): (42.35, 13.40),
    ("Italy", "Basilicata"): (40.63, 15.80),
    ("Italy", "Calabria"): (39.31, 16.25),
    ("Italy", "Campania"): (40.86, 14.84),
    ("Italy", "Emilia Romagna"): (44.53, 11.00),
    ("Italy", "Friuli Venezia Giulia"): (46.15, 13.05),
    ("Italy", "Lazio"): (41.90, 12.70),
    ("Italy", "Liguria"): (44.32, 8.83),
    ("Italy", "Lombardia"): (45.58, 9.70),
    ("Italy", "Marche"): (43.62, 13.52),
    ("Italy", "Molise"): (41.67, 14.67),
    ("Italy", "Piemonte"): (45.05, 7.92),
    ("Italy", "Puglia"): (41.12, 16.87),
    ("Italy", "Sardegna"): (40.12, 9.01),
    ("Italy", "Sicilia"): (37.60, 14.02),
    ("Italy", "Toscana"): (43.77, 11.25),
    ("Italy", "Trentino Alto Adige"): (46.43, 11.35),
    ("Italy", "Umbria"): (42.94, 12.50),
    ("Italy", "Valle d’Aosta"): (45.74, 7.32),
    ("Italy", "Veneto"): (45.65, 11.87),
    ("Serbia", "Western Balkans"): (44.02, 21.01),
    ("Spain", "Aragón"): (41.60, -0.88),
    ("Spain", "Baleares"): (39.70, 3.02),
    ("Spain", "Barcelona"): (41.39, 2.17),
    ("Spain", "Canarias"): (28.29, -16.63),
    ("Spain", "Castilla y León"): (41.84, -4.84),
    ("Spain", "Galicia"): (42.58, -7.76),
    ("Spain", "Madrid"): (40.42, -3.70),
    ("Spain", "Málaga"): (36.72, -4.42),
    ("Spain", "Navarra"): (42.70, -1.68),
    ("Spain", "País Vasco"): (42.99, -2.62),
    ("Spain", "Sevilla"): (37.39, -5.98),
    ("Spain", "Valencia"): (39.47, -0.38),
    ("United Kingdom", "East Anglia"): (52.40, 1.00),
    ("United Kingdom", "East Midlands"): (52.83, -0.85),
    ("United Kingdom", "London"): (51.51, -0.13),
    ("United Kingdom", "North East"): (54.97, -1.61),
    ("United Kingdom", "North Wales"): (53.14, -3.78),
    ("United Kingdom", "North West"): (53.48, -2.24),
    ("United Kingdom", "Northern Ireland"): (54.79, -6.49),
    ("United Kingdom", "Scotland"): (56.49, -4.20),
    ("United Kingdom", "South East England"): (51.18, -0.35),
    ("United Kingdom", "South England"): (50.91, -1.40),
    ("United Kingdom", "South Wales"): (51.62, -3.34),
    ("United Kingdom", "South West England"): (50.78, -3.58),
    ("United Kingdom", "Three Counties (Bucks, Beds and Herts)"): (51.90, -0.50),
    ("United Kingdom", "West Midlands"): (52.48, -1.89),
    ("United Kingdom", "Yorkshire"): (53.96, -1.09),
    ("United States", "California"): (36.78, -119.42),
    ("United States", "Chicago, Illinois"): (41.88, -87.63),
    ("United States", "Florida"): (27.66, -81.52),
    ("United States", "Idaho"): (44.07, -114.74),
    ("United States", "New England"): (43.17, -71.58),
    ("United States", "North Carolina Triangle"): (35.88, -78.79),
    ("United States", "St. Louis, Missouri"): (38.63, -90.20),
    ("United States", "Texas"): (31.97, -99.90),
    ("United States", "Washington"): (47.40, -120.49),
}

NATIONAL_REGIONS = {
    "",
    "national",
    "nationwide",
    "national / online",
    "national online",
    "online",
    "online / international",
    "worldwide",
    "spanish-speaking community",
}


def section_of(tier: str) -> str | None:
    if tier.startswith("CLUB —"):
        return "club"
    if tier.startswith("CHAPTER —"):
        return "chapter"
    if tier.startswith("COMMUNITY —"):
        return "community"
    return None


def kind_of(section: str, group_type: str) -> str:
    g = (group_type or "").lower()
    if "facebook" in g:
        return "Facebook group"
    if "telegram" in g:
        return "Telegram"
    if "meetup" in g:
        return "Meetup"
    if "whatsapp" in g:
        return "WhatsApp"
    if "forum" in g:
        return "Forum"
    if "chapter" in g:
        return "Chapter"
    if "online" in g:
        return "Online group"
    if section == "club":
        return "Owners club"
    if section == "chapter":
        return "Chapter"
    return "Independent community"


def channel_of(url: str) -> str:
    u = (url or "").lower()
    if not u:
        return ""
    if "facebook.com" in u:
        return "Facebook"
    if "t.me/" in u or "telegram." in u:
        return "Telegram"
    if "meetup.com" in u:
        return "Meetup"
    if "groups.google.com" in u:
        return "Google Group"
    if "naver.com" in u:
        return "Naver"
    if "x.com/" in u or "twitter.com" in u:
        return "X"
    return "Website"


def coords(country: str, region: str) -> tuple[float | None, float | None]:
    if country in ("Global", "International"):
        return None, None
    key = (country, region or "")
    if key in REGION_LL:
        return REGION_LL[key]
    if (region or "").strip().lower() in NATIONAL_REGIONS:
        return COUNTRY_LL.get(country, (None, None))
    return COUNTRY_LL.get(country, (None, None))


def public_email(rec: dict) -> str:
    email = (rec.get("public_email") or "").strip()
    if not email or "@" not in email:
        return ""
    if rec.get("has_public_email") == "No":
        return ""
    return email


def x_handle(rec: dict) -> str:
    h = (rec.get("x_handle") or "").strip().lstrip("@")
    if not h:
        return ""
    return h


def slim(rec: dict) -> dict | None:
    section = section_of(rec.get("publication_tier_2026_10_16") or "")
    if not section:
        return None
    country = (rec.get("country") or "").strip()
    region = (rec.get("region") or "").strip()
    lat, lon = coords(country, region)
    website = (rec.get("website_url") or "").strip()
    handle = x_handle(rec)
    x_url = (rec.get("x_url") or "").strip()
    if handle and not x_url:
        x_url = f"https://x.com/{handle}"
    out = {
        "id": rec["club_id"],
        "name": rec["club_name"].strip(),
        "section": section,
        "kind": kind_of(section, rec.get("group_type") or ""),
        "country": country,
        "region": region,
        "parent": (rec.get("parent_club") or "").strip(),
        "website": website,
        "channel": channel_of(website),
        "email": public_email(rec),
        "x": handle,
        "xUrl": x_url,
    }
    if lat is not None and lon is not None:
        out["lat"] = round(lat, 4)
        out["lon"] = round(lon, 4)
    return out


def main() -> int:
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    dest = ROOT / "tesla-clubs-data.js"
    raw = json.loads(src.read_text())
    clubs = []
    skipped = 0
    for rec in raw.get("records", []):
        row = slim(rec)
        if row:
            clubs.append(row)
        else:
            skipped += 1
    clubs.sort(key=lambda r: (r["section"], r["country"], r["region"], r["name"]))
    counts = {
        "club": sum(1 for c in clubs if c["section"] == "club"),
        "chapter": sum(1 for c in clubs if c["section"] == "chapter"),
        "community": sum(1 for c in clubs if c["section"] == "community"),
        "excluded": skipped,
    }
    payload = {
        "updated": raw.get("audit_date", "2026-10-16"),
        "counts": counts,
        "clubs": clubs,
    }
    dest.write_text(
        "window.TESLA_CLUBS = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )
    print(f"wrote {dest} public={len(clubs)} excluded={skipped} {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
