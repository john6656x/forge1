"""
Etsy Public Page Scraper — Pure HTML, Zero API Keys
=====================================================
Extrage date MAXIME din paginile publice Etsy (shop, listing, search, reviews)
fără niciun API key. Folosește layered parsing: JSON-LD → regex → meta → DOM.

Politeness: delay random 2-5s, User-Agent rotation, session cookies.
"""
import re
import json
import time
import random
import html
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent


class EtsyScraperEngine:
    """Motor de scraping Etsy — 100% public pages, 0 API keys."""

    BASE = "https://www.etsy.com"
    MIN_DELAY = 2.0
    MAX_DELAY = 5.0

    def __init__(self, proxy: Optional[str] = None):
        self.session = requests.Session()
        self.ua = UserAgent(fallback="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        self.proxy = {"http": proxy, "https": proxy} if proxy else None
        self._last_request = 0

    def _headers(self) -> dict:
        return {
            "User-Agent": self.ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

    def _delay(self):
        """Rate limiting politicos."""
        elapsed = time.time() - self._last_request
        need = random.uniform(self.MIN_DELAY, self.MAX_DELAY)
        if elapsed < need:
            time.sleep(need - elapsed)
        self._last_request = time.time()

    def _fetch(self, url: str, retries: int = 3) -> str:
        """Fetch cu retry și polite delay."""
        for attempt in range(retries):
            self._delay()
            try:
                resp = self.session.get(url, headers=self._headers(), proxies=self.proxy, timeout=20, allow_redirects=True)
                resp.raise_for_status()
                # Detectare bot-check
                if self._is_blocked(resp.text):
                    if attempt < retries - 1:
                        wait = (2 ** attempt) * 3 + random.random() * 5
                        print(f"  [!] Bot detectat pe {url}, aștept {wait:.1f}s...")
                        time.sleep(wait)
                        continue
                    raise ScraperBlockedError(f"Etsy a servit bot-check pentru {url}")
                return resp.text
            except requests.RequestException as e:
                if attempt == retries - 1:
                    raise ScraperError(f"Eroare fetch {url}: {e}")
                time.sleep((2 ** attempt) + random.random() * 3)
        raise ScraperError(f"Eșuat după {retries} încercări: {url}")

    def _is_blocked(self, html_text: str) -> bool:
        """Detectează pagini de bot-check."""
        markers = [
            "datadome", "captcha-delivery", "geo.captcha", "Please verify you are a human",
            "blocked?", "unusual traffic", "access denied", "Pardon Our Interruption",
            "cf-browser-verification", "__cf_bm", "turnstile", "recaptcha",
        ]
        low = html_text[:6000].lower()
        return any(m.lower() in low for m in markers)

    # ═══════════════════════════════════════════════════════════
    #  PARSARE LAYERED (cea mai robustă parte)
    # ═══════════════════════════════════════════════════════════

    def _jsonld(self, soup: BeautifulSoup) -> List[Dict]:
        """Extrage toate blocurile JSON-LD."""
        out = []
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                out.extend(data if isinstance(data, list) else [data])
            except Exception:
                continue
        return out

    def _find_jsonld(self, soup: BeautifulSoup, type_name: str) -> Optional[Dict]:
        for item in self._jsonld(soup):
            if item.get("@type") == type_name:
                return item
        return None

    def _meta(self, soup: BeautifulSoup, prop: str) -> Optional[str]:
        """Extrage meta tag (OpenGraph sau standard)."""
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        return tag.get("content", "").strip() if tag else None

    def _text(self, soup: BeautifulSoup, selectors: List[str]) -> Optional[str]:
        """Încearcă selectori până găsește text."""
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                txt = el.get_text(strip=True)
                if txt:
                    return txt
        return None

    def _num(self, text: Optional[str]) -> Optional[int]:
        """Extrage număr din text: '12,345 sales' → 12345."""
        if not text:
            return None
        nums = re.findall(r"[\d,]+", text.replace(",", ""))
        if nums:
            try:
                return int(nums[0])
            except ValueError:
                pass
        return None

    def _price(self, text: Optional[str]) -> tuple:
        """Extrage preț și monedă."""
        if not text:
            return None, None
        m = re.search(r"([\$\u20ac\u00a3\u00a5])?\s*([\d,]+(?:\.\d{1,2})?)\s*([\$\u20ac\u00a3\u00a5])?", text)
        if m:
            price = float(m.group(2).replace(",", ""))
            sym = m.group(1) or m.group(3)
            cmap = {"$": "USD", "\u20ac": "EUR", "\u00a3": "GBP", "\u00a5": "JPY"}
            return price, cmap.get(sym, sym)
        return None, None

    def _clean_html(self, raw: str) -> str:
        """Curăță HTML entities și taguri."""
        return html.unescape(re.sub(r"<[^>]+>", "", raw))

    # ═══════════════════════════════════════════════════════════
    #  SHOP SCRAPING
    # ═══════════════════════════════════════════════════════════

    def scrape_shop(self, shop_name: str) -> Dict[str, Any]:
        """Scrapează pagina unui shop Etsy. Extrage TOATE datele posibile."""
        slug = shop_name.strip().replace("https://www.etsy.com/shop/", "").replace("/", "").split("?")[0]
        url = f"{self.BASE}/shop/{slug}"
        print(f"[>] Scraping shop: {slug}")

        html_text = self._fetch(url)
        soup = BeautifulSoup(html_text, "lxml")

        result = {
            "shop_name": slug,
            "shop_url": url,
            "scraped_at": datetime.now().isoformat(),
            "source": "public_page",
        }

        # 1. JSON-LD Organization/Store
        org = self._find_jsonld(soup, "Organization") or self._find_jsonld(soup, "Store")
        if org:
            result["name"] = org.get("name")
            result["description"] = org.get("description")
            addr = org.get("address", {})
            if isinstance(addr, dict):
                result["location"] = addr.get("addressLocality") or addr.get("addressRegion")
            rating = org.get("aggregateRating", {})
            if isinstance(rating, dict):
                result["rating"] = rating.get("ratingValue")
                result["reviews_count"] = rating.get("reviewCount")

        # 2. Meta fallback
        result["name"] = result.get("name") or self._meta(soup, "og:title") or slug
        result["description"] = result.get("description") or self._meta(soup, "og:description")

        # 3. HTML selectors defensive
        result["name"] = result.get("name") or self._text(soup, [
            "h1.shop-name", "[data-shop-name]", ".shop-home-header h1", "h1"
        ])

        # Sales
        sales_text = self._text(soup, [
            "[data-appears-component-name='shop_home_header'] .wt-text-caption",
            ".shop-sales", ".wt-text-caption", "[data-sales]"
        ])
        result["total_sales"] = self._num(sales_text)

        # Review count
        review_text = self._text(soup, [
            "[data-rating]", ".reviews-total", ".stars-smaller + span",
            "[data-review-count]"
        ])
        result["reviews_count"] = self._num(review_text) or result.get("reviews_count")

        # Rating
        rating_el = soup.select_one("[data-rating]")
        if rating_el and not result.get("rating"):
            try:
                result["rating"] = float(rating_el.get("data-rating", 0))
            except ValueError:
                pass

        # Location
        if not result.get("location"):
            result["location"] = self._text(soup, [
                ".shop-location", "[data-shop-location]", ".wt-text-caption"
            ])

        # Owner
        result["owner"] = self._text(soup, [
            ".shop-owner-name", "[data-shop-owner]", ".shop-owner"
        ])

        # Listings count
        listings_text = self._text(soup, [
            ".shop-listing-count", "[data-listing-count]",
            "[data-appears-component-name='shop_home_header']"
        ])
        result["listings_count"] = self._num(listings_text)

        # On Etsy since
        since = re.search(r"On Etsy since\s*<?[^>]*>?\s*(\d{4})", html_text, re.I)
        if not since:
            since = re.search(r"opened in (\d{4})", html_text, re.I)
        if since:
            result["on_etsy_since"] = int(since.group(1))

        # Favorites (din JSON inline)
        fav_match = re.search(r'"num_favorers"\s*:\s*(\d+)', html_text)
        if fav_match:
            result["favorites"] = int(fav_match.group(1))

        # Shop ID
        shop_id_match = re.search(r'"shop_id"\s*:\s*(\d+)', html_text)
        if shop_id_match:
            result["shop_id"] = int(shop_id_match.group(1))

        # Tagline / title
        tagline = re.search(r'"shop_title"\s*:\s*"([^"]{2,200})"', html_text)
        if tagline:
            result["tagline"] = tagline.group(1)

        # Banner image
        banner = soup.select_one(".shop-header img, .shop-banner img, [data-shop-banner] img")
        if banner:
            result["banner_url"] = banner.get("src") or banner.get("data-src")

        # Avatar
        avatar = soup.select_one(".shop-icon img, [data-shop-icon] img, .shop-avatar img")
        if avatar:
            result["avatar_url"] = avatar.get("src") or avatar.get("data-src")

        print(f"  [✓] Shop: {result.get('name', slug)} | Sales: {result.get('total_sales')} | Reviews: {result.get('reviews_count')}")
        return result

    # ═══════════════════════════════════════════════════════════
    #  LISTING SCRAPING
    # ═══════════════════════════════════════════════════════════

    def scrape_listing(self, listing_url: str) -> Dict[str, Any]:
        """Scrapează o pagină de listing individual."""
        if not listing_url.startswith("http"):
            listing_url = f"{self.BASE}/listing/{listing_url}"
        print(f"[>] Scraping listing: {listing_url}")

        html_text = self._fetch(listing_url)
        soup = BeautifulSoup(html_text, "lxml")

        result = {
            "url": listing_url,
            "scraped_at": datetime.now().isoformat(),
            "source": "public_page",
        }

        # Listing ID
        id_match = re.search(r"/listing/(\d+)", listing_url)
        if id_match:
            result["listing_id"] = id_match.group(1)

        # JSON-LD Product
        product = self._find_jsonld(soup, "Product")
        if product:
            result["title"] = product.get("name")
            result["description"] = product.get("description")
            offers = product.get("offers", {})
            if isinstance(offers, dict):
                result["price"] = self._num(str(offers.get("price", "")))
                result["currency"] = offers.get("priceCurrency")
                result["availability"] = offers.get("availability")
            elif isinstance(offers, list) and offers:
                result["price"] = self._num(str(offers[0].get("price", "")))
                result["currency"] = offers[0].get("priceCurrency")
            brand = product.get("brand", {})
            if isinstance(brand, dict):
                result["shop_name"] = brand.get("name")
            images = product.get("image", [])
            if isinstance(images, str):
                result["images"] = [images]
            elif isinstance(images, list):
                result["images"] = images

        # Meta fallback
        result["title"] = result.get("title") or self._meta(soup, "og:title")
        result["description"] = result.get("description") or self._meta(soup, "og:description")

        # Titlu din H1
        if not result.get("title"):
            result["title"] = self._text(soup, [
                "h1[data-buy-box-listing-title]", "h1[data-listing-title]",
                "h1[data-testid='listing-title']", "h1"
            ])

        # Preț din HTML
        if not result.get("price"):
            price_text = self._text(soup, [
                "[data-buy-box-region='price'] .currency-value",
                ".currency-value", "[data-price]", ".wt-text-title-01"
            ])
            if price_text:
                p, c = self._price(price_text)
                result["price"] = p
                result["currency"] = c

        # Preț original (discount)
        orig_price = self._text(soup, [
            "[data-buy-box-region='price'] .wt-text-strikethrough",
            ".wt-text-strikethrough", ".original-price"
        ])
        if orig_price:
            p, _ = self._price(orig_price)
            if p and result.get("price") and p > result["price"]:
                result["original_price"] = p
                result["discount_percent"] = round((1 - result["price"] / p) * 100)

        # Reviews
        review_text = self._text(soup, [
            "[data-reviews-count]", ".reviews-total",
            "[data-buy-box-region='reviews']", "[data-rating]"
        ])
        if review_text:
            result["reviews_count"] = self._num(review_text)

        # Rating
        rating_el = soup.select_one("[data-rating]")
        if rating_el:
            try:
                result["rating"] = float(rating_el.get("data-rating", 0))
            except ValueError:
                pass

        # Images count
        img_selectors = [
            "ul[data-carousel-pagination-list] li",
            "[data-carousel-pager] li",
            "img[data-index]",
            ".image-carousel-container img",
            "[data-listing-card-listing-image]"
        ]
        img_count = 0
        for sel in img_selectors:
            imgs = soup.select(sel)
            if len(imgs) > img_count:
                img_count = len(imgs)
        result["images_count"] = img_count

        # Tags (din JSON inline sau meta)
        tags_match = re.search(r'"tags"\s*:\s*\[(.*?)\]', html_text, re.S)
        if tags_match:
            try:
                tags_raw = "[" + tags_match.group(1) + "]"
                tags = json.loads(tags_raw)
                result["tags"] = [t for t in tags if isinstance(t, str)]
            except Exception:
                pass

        # Materials
        materials_match = re.search(r'"materials"\s*:\s*\[(.*?)\]', html_text, re.S)
        if materials_match:
            try:
                mats_raw = "[" + materials_match.group(1) + "]"
                mats = json.loads(mats_raw)
                result["materials"] = [m for m in mats if isinstance(m, str)]
            except Exception:
                pass

        # Styles
        styles_match = re.search(r'"style"\s*:\s*\[(.*?)\]', html_text, re.S)
        if styles_match:
            try:
                st_raw = "[" + styles_match.group(1) + "]"
                st = json.loads(st_raw)
                result["styles"] = [s for s in st if isinstance(s, str)]
            except Exception:
                pass

        # Processing time
        proc = self._text(soup, [
            "[data-processing-time]", ".processing-time", "[data-estimated-delivery]"
        ])
        if proc:
            result["processing_time"] = proc

        # Shipping
        ship = self._text(soup, [
            "[data-shipping]", ".shipping-cost", "[data-estimated-delivery]"
        ])
        if ship:
            result["shipping_info"] = ship

        # Variations
        variations = []
        for sel in soup.select("[data-variation]", limit=10):
            name = sel.get("data-variation") or sel.get_text(strip=True)
            if name:
                variations.append(name)
        if variations:
            result["variations"] = variations

        # Favorites
        fav_match = re.search(r'"num_favorers"\s*:\s*(\d+)', html_text)
        if fav_match:
            result["favorites"] = int(fav_match.group(1))

        # Shop name fallback
        if not result.get("shop_name"):
            shop_match = re.search(r'"shop_name"\s*:\s*"([^"]+)"', html_text)
            if shop_match:
                result["shop_name"] = shop_match.group(1)

        print(f"  [✓] Listing: {result.get('title', 'N/A')[:50]} | Price: {result.get('price')} {result.get('currency')} | Images: {result.get('images_count')}")
        return result

    # ═══════════════════════════════════════════════════════════
    #  SEARCH SCRAPING
    # ═══════════════════════════════════════════════════════════

    def scrape_search(self, query: str, pages: int = 1) -> List[Dict[str, Any]]:
        """Scrapează rezultatele de căutare Etsy."""
        results = []
        for page in range(1, pages + 1):
            offset = (page - 1) * 64
            url = f"{self.BASE}/search?q={requests.utils.quote(query)}&ref=search_bar&offset={offset}"
            print(f"[>] Scraping search: '{query}' page {page} (offset {offset})")

            html_text = self._fetch(url)
            soup = BeautifulSoup(html_text, "lxml")

            # Metodă 1: JSON-LD Product blocks
            for product in self._jsonld(soup):
                if product.get("@type") != "Product":
                    continue
                item = {
                    "title": product.get("name"),
                    "url": product.get("url"),
                    "shop_name": product.get("brand", {}).get("name") if isinstance(product.get("brand"), dict) else None,
                }
                offers = product.get("offers", {})
                if isinstance(offers, dict):
                    item["price"] = self._num(str(offers.get("price", "")))
                    item["currency"] = offers.get("priceCurrency")
                elif isinstance(offers, list) and offers:
                    item["price"] = self._num(str(offers[0].get("price", "")))
                    item["currency"] = offers[0].get("priceCurrency")
                rating = product.get("aggregateRating", {})
                if isinstance(rating, dict):
                    item["rating"] = rating.get("ratingValue")
                    item["reviews_count"] = rating.get("reviewCount")
                if item.get("title"):
                    results.append(item)

            # Metodă 2: Carduri DOM (fallback)
            if not results:
                cards = soup.select(".v2-listing-card, [data-listing-card], .listing-card")
                for card in cards:
                    title_el = card.select_one("h3, h2, .v2-listing-card__title, [data-listing-card-title]")
                    price_el = card.select_one(".currency-value, .n-listing-card__price, [data-price]")
                    shop_el = card.select_one(".shop-name, [data-shop-name]")
                    link_el = card.select_one("a[href*='/listing/']")

                    item = {
                        "title": title_el.get_text(strip=True) if title_el else None,
                        "price": self._num(price_el.get_text(strip=True)) if price_el else None,
                        "shop_name": shop_el.get_text(strip=True) if shop_el else None,
                        "url": urljoin(self.BASE, link_el["href"]) if link_el and link_el.get("href") else None,
                    }
                    if item.get("title"):
                        results.append(item)

            print(f"  [✓] {len(results)} total results so far")

        return results

    # ═══════════════════════════════════════════════════════════
    #  REVIEWS SCRAPING
    # ═══════════════════════════════════════════════════════════

    def scrape_reviews(self, shop_name: str, max_reviews: int = 25) -> List[Dict[str, Any]]:
        """Scrapează reviews de pe pagina de reviews a shop-ului."""
        slug = shop_name.strip().replace("https://www.etsy.com/shop/", "").replace("/", "").split("?")[0]
        url = f"{self.BASE}/shop/{slug}/reviews"
        print(f"[>] Scraping reviews for: {slug}")

        html_text = self._fetch(url)
        soup = BeautifulSoup(html_text, "lxml")

        reviews = []

        # Metodă 1: JSON-LD Review blocks
        for item in self._jsonld(soup):
            if item.get("@type") != "Review":
                continue
            rating = item.get("reviewRating", {})
            if isinstance(rating, dict):
                stars = rating.get("ratingValue")
            else:
                stars = None
            reviews.append({
                "rating": stars,
                "text": item.get("reviewBody", ""),
                "author": item.get("author", {}).get("name") if isinstance(item.get("author"), dict) else None,
                "date": item.get("datePublished"),
                "source": "jsonld"
            })

        # Metodă 2: DOM parsing (fallback)
        if not reviews:
            review_blocks = soup.select("[data-review], .review, .review-card")
            for block in review_blocks[:max_reviews]:
                # Rating din aria-label sau text
                rating_el = block.select_one("[aria-label*='star'], [data-rating], .stars")
                rating = None
                if rating_el:
                    aria = rating_el.get("aria-label", "")
                    m = re.search(r'(\d\.?\d?)\s*out of\s*5', aria)
                    if m:
                        rating = float(m.group(1))
                    else:
                        m = re.search(r'(\d)', aria)
                        if m:
                            rating = int(m.group(1))

                text_el = block.select_one(".review-text, [data-review-text], p")
                text = text_el.get_text(strip=True) if text_el else ""

                author_el = block.select_one(".reviewer-name, [data-reviewer]")
                author = author_el.get_text(strip=True) if author_el else None

                date_el = block.select_one(".review-date, [data-review-date], time")
                date = date_el.get_text(strip=True) if date_el else None
                if not date and date_el and date_el.get("datetime"):
                    date = date_el["datetime"]

                if text:
                    reviews.append({
                        "rating": rating,
                        "text": text,
                        "author": author,
                        "date": date,
                        "source": "dom"
                    })

        # Limită
        reviews = reviews[:max_reviews]

        # Sentiment
        for r in reviews:
            if r["rating"] is not None:
                if r["rating"] >= 4:
                    r["sentiment"] = "positive"
                elif r["rating"] == 3:
                    r["sentiment"] = "neutral"
                else:
                    r["sentiment"] = "negative"

        print(f"  [✓] {len(reviews)} reviews extracted")
        return reviews

    # ═══════════════════════════════════════════════════════════
    #  SHOP LISTINGS (toate listing-urile unui shop)
    # ═══════════════════════════════════════════════════════════

    def scrape_shop_listings(self, shop_name: str, max_listings: int = 50) -> List[Dict[str, Any]]:
        """Scrapează toate listing-urile vizibile pe pagina unui shop."""
        slug = shop_name.strip().replace("https://www.etsy.com/shop/", "").replace("/", "").split("?")[0]
        url = f"{self.BASE}/shop/{slug}"
        print(f"[>] Scraping listings from shop: {slug}")

        html_text = self._fetch(url)
        soup = BeautifulSoup(html_text, "lxml")

        listings = []
        seen = set()

        # Caută linkuri către listing-uri
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/listing/" not in href:
                continue
            full = urljoin(self.BASE, href)
            parsed = urlparse(full)
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if clean in seen:
                continue
            seen.add(clean)

            # Extrage info rapid din card (fără să intre pe pagina listing-ului)
            card = a.find_parent("li") or a.find_parent("div", class_=re.compile("card|listing")) or a.find_parent("div")
            item = {"url": clean}

            if card:
                title_el = card.select_one("h3, h2, .title, [data-title]")
                item["title"] = title_el.get_text(strip=True) if title_el else None

                price_el = card.select_one(".currency-value, [data-price], .price")
                if price_el:
                    item["price"] = self._num(price_el.get_text(strip=True))

                img_el = card.select_one("img")
                if img_el:
                    item["thumbnail"] = img_el.get("src") or img_el.get("data-src")

            listings.append(item)
            if len(listings) >= max_listings:
                break

        print(f"  [✓] {len(listings)} listing links found")
        return listings


class ScraperError(Exception):
    pass


class ScraperBlockedError(ScraperError):
    pass
