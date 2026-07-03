# Etsy Scraper Pro — Zero API Keys

**Scraper 100% standalone pentru Etsy.** Nu necesită API key, nu necesită cont, nu necesită proxy (dar suportă dacă vrei). Extrage date maxime din paginile publice Etsy.

---

## Ce extrage

### Shop
- `name`, `shop_name`, `shop_url`, `shop_id`
- `total_sales`, `reviews_count`, `rating`
- `favorites`, `listings_count`
- `location`, `owner`, `tagline`, `description`
- `on_etsy_since` (anul în care s-a deschis shop-ul)
- `banner_url`, `avatar_url`

### Listing
- `listing_id`, `title`, `description`
- `price`, `original_price`, `discount_percent`, `currency`
- `images_count`, `images` (URL-uri)
- `tags`, `materials`, `styles`
- `reviews_count`, `rating`
- `favorites`, `processing_time`, `shipping_info`
- `variations`, `availability`
- `shop_name`

### Reviews
- `rating` (1-5 stele)
- `text` (conținutul review-ului)
- `author`, `date`
- `sentiment` (positive / neutral / negative)

### Search
- `title`, `price`, `currency`, `shop_name`, `url`, `rating`, `reviews_count`

---

## Instalare

```bash
pip install -r requirements.txt
```

**Fără playwright, fără selenium, fără headless browser.** Doar `requests` + `BeautifulSoup`.

---

## Utilizare

### 1. Shop (rapid — doar datele shop-ului)
```bash
python scraper.py shop WillowStudio
```

### 2. Shop + listing-uri
```bash
python scraper.py shop WillowStudio --listings --max-listings 30
```

### 3. Shop + reviews
```bash
python scraper.py shop WillowStudio --reviews --max-reviews 50
```

### 4. Shop COMPLET (shop + toate listing-urile + reviews)
```bash
python scraper.py full WillowStudio --max-listings 50 --max-reviews 50
```

### 5. Listing individual
```bash
python scraper.py listing https://www.etsy.com/listing/123456789/
# sau doar ID-ul:
python scraper.py listing 123456789
```

### 6. Căutare
```bash
python scraper.py search "ceramic mug" --pages 2
```

### 7. Cu proxy (opțional)
```bash
python scraper.py full WillowStudio --proxy "http://user:pass@proxy:port"
```

---

## Arhitectura de parsare (Layered)

Pentru fiecare pagină, motorul încearcă în ordine:

1. **JSON-LD** (`application/ld+json`) — cele mai fiabile date structurate
2. **OpenGraph meta tags** (`og:title`, `og:description`, `product:price:amount`)
3. **Regex targeted** — extrage date din inline JS (sales, favorites, tags, materials)
4. **DOM selectors** — fallback cu multiple selectori defensivi
5. **HTML text** — ultim resort

Dacă un strat eșuează, trece automat la următorul. **Niciodată nu crapă.**

---

## Anti-Bot & Politeness

| Mecanism | Valoare |
|----------|---------|
| Delay între requests | 2–5 secunde (random) |
| User-Agent | Rotativ (fake-useragent) |
| Retry | 3 încercări cu backoff exponențial |
| Bot detection | Detectează DataDome, reCAPTCHA, Cloudflare și așteaptă |
| Session cookies | Păstrează cookies între request-uri |

---

## Output

Fiecare comandă generează:
- `output/NumeleShop_YYYYMMDD_HHMMSS.json` — date complete, nested
- `output/NumeleShop_YYYYMMDD_HHMMSS.csv` — date flat (pentru Excel)

---

## Exemplu output JSON (shop)

```json
{
  "shop": {
    "shop_name": "WillowStudio",
    "name": "Willow Studio",
    "shop_url": "https://www.etsy.com/shop/WillowStudio",
    "total_sales": 15420,
    "reviews_count": 3421,
    "rating": 4.9,
    "favorites": 12500,
    "listings_count": 45,
    "location": "Bucharest, Romania",
    "on_etsy_since": 2018,
    "owner": "Maria P.",
    "tagline": "Handmade ceramics for everyday joy",
    "description": "We create functional pottery..."
  },
  "listings": [
    {
      "listing_id": "123456789",
      "title": "Handmade Ceramic Mug — Rustic Coffee Cup",
      "price": 28.00,
      "currency": "USD",
      "original_price": 35.00,
      "discount_percent": 20,
      "images_count": 8,
      "tags": ["ceramic mug", "coffee cup", "handmade pottery"],
      "materials": ["stoneware", "glaze"],
      "styles": ["rustic", "minimalist"],
      "reviews_count": 128,
      "rating": 4.8,
      "favorites": 450
    }
  ],
  "reviews": [
    {
      "rating": 5,
      "text": "Absolutely beautiful, even better in person...",
      "author": "Sarah M.",
      "date": "2026-06-15",
      "sentiment": "positive"
    }
  ]
}
```

---

## Troubleshooting

| Problemă | Soluție |
|----------|---------|
| "Bot detectat" | Așteaptă 30s și reîncearcă. Sau folosește proxy (`--proxy`). |
| Date lipsă (ex: tags) | Etsy nu expune întotdeauna toate datele pe paginile publice. Motorul returnează ce găsește. |
| Timeout | Crește timeout în `engine.py` (linia `timeout=20`). |
| Prea multe request-uri | Etsy îți va servi bot-check. Fă pauze mai lungi (`MIN_DELAY` în `engine.py`). |

---

## Disclaimer

Acest tool citește **doar paginile publice** ale Etsy (accesibile oricărui vizitator fără login). Respectă rate limiting-ul și nu face abuse. Folosește-l responsabil.

**Nu e afiliat cu Etsy, Inc.** "Etsy" este marcă înregistrată a Etsy, Inc.

---

## Fișiere

```
etsy-scraper-pro/
├── engine.py          # Motorul principal de scraping
├── scraper.py         # CLI
├── requirements.txt   # Dependențe
└── README.md          # Acest fișier
```
