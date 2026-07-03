#!/usr/bin/env python3
"""
Etsy Scraper Pro — CLI
======================
Scrapează magazine, listing-uri, reviews și căutări de pe Etsy
FĂRĂ niciun API key. 100% public pages.

Usage:
    python scraper.py shop <shop_name> [--listings] [--reviews] [--output dir]
    python scraper.py listing <listing_url_or_id>
    python scraper.py search <query> [--pages N]
    python scraper.py full <shop_name>  # shop + listings + reviews

Examples:
    python scraper.py shop WillowStudio --listings --reviews
    python scraper.py listing https://www.etsy.com/listing/123456789/
    python scraper.py search "ceramic mug" --pages 2
    python scraper.py full WillowStudio --output date/
"""
import argparse
import json
import os
import sys
from datetime import datetime

from engine import EtsyScraperEngine, ScraperError, ScraperBlockedError


def save_json(data, path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[✓] JSON: {path}")


def save_csv(data, path):
    """Salvează date flat în CSV."""
    try:
        import pandas as pd
    except ImportError:
        print("[!] pandas nu e instalat. Se salvează doar JSON.")
        return

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    if not data:
        print("[!] Nu există date pentru CSV.")
        return

    # Flatten nested dicts
    df = pd.json_normalize(data, sep="_")
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print(f"[✓] CSV: {path}")


def timestamp():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def cmd_shop(args):
    engine = EtsyScraperEngine(proxy=args.proxy)
    shop_data = engine.scrape_shop(args.shop_name)

    all_data = {"shop": shop_data, "listings": [], "reviews": []}

    if args.listings:
        listing_links = engine.scrape_shop_listings(args.shop_name, max_listings=args.max_listings)
        detailed = []
        for i, link in enumerate(listing_links, 1):
            print(f"  [{i}/{len(listing_links)}] Detaliu listing...")
            try:
                detail = engine.scrape_listing(link["url"])
                detailed.append(detail)
            except Exception as e:
                print(f"  [!] Eroare: {e}")
                continue
        all_data["listings"] = detailed
        shop_data["listings_count"] = len(detailed)

    if args.reviews:
        try:
            reviews = engine.scrape_reviews(args.shop_name, max_reviews=args.max_reviews)
            all_data["reviews"] = reviews
            shop_data["reviews_scraped"] = len(reviews)
        except Exception as e:
            print(f"  [!] Eroare reviews: {e}")

    # Salvează
    safe_name = re.sub(r"[^\w-]", "_", shop_data.get("name", args.shop_name))
    base = f"{args.output}/{safe_name}_{timestamp()}"
    save_json(all_data, base + ".json")
    save_csv(all_data["listings"] if all_data["listings"] else [shop_data], base + ".csv")

    print(f"\n[✓] Gata! Shop: {shop_data.get('name', args.shop_name)}")
    print(f"    Sales: {shop_data.get('total_sales')} | Reviews: {shop_data.get('reviews_count')} | Listings: {len(all_data['listings'])}")


def cmd_listing(args):
    engine = EtsyScraperEngine(proxy=args.proxy)
    data = engine.scrape_listing(args.listing_url)
    base = f"{args.output}/listing_{data.get('listing_id', 'unknown')}_{timestamp()}"
    save_json(data, base + ".json")
    save_csv([data], base + ".csv")
    print(f"\n[✓] Listing: {data.get('title', 'N/A')[:60]}")
    print(f"    Price: {data.get('price')} {data.get('currency')} | Images: {data.get('images_count')} | Tags: {len(data.get('tags', []))}")


def cmd_search(args):
    engine = EtsyScraperEngine(proxy=args.proxy)
    results = engine.scrape_search(args.query, pages=args.pages)
    base = f"{args.output}/search_{re.sub(r'[^\w]', '_', args.query)}_{timestamp()}"
    save_json(results, base + ".json")
    save_csv(results, base + ".csv")
    print(f"\n[✓] Căutare: '{args.query}' — {len(results)} rezultate")


def cmd_full(args):
    """Shop + toate listing-urile + reviews."""
    args.listings = True
    args.reviews = True
    args.max_listings = args.max_listings or 50
    args.max_reviews = args.max_reviews or 50
    cmd_shop(args)


def main():
    parser = argparse.ArgumentParser(description="Etsy Scraper Pro — Zero API Keys")
    sub = parser.add_subparsers(dest="command", required=True)

    # shop
    p_shop = sub.add_parser("shop", help="Scrapează un shop")
    p_shop.add_argument("shop_name", help="Numele shop-ului sau URL")
    p_shop.add_argument("--listings", action="store_true", help="Scrapează și listing-urile")
    p_shop.add_argument("--reviews", action="store_true", help="Scrapează și reviews")
    p_shop.add_argument("--max-listings", type=int, default=20, help="Max listing-uri de scrape-uit")
    p_shop.add_argument("--max-reviews", type=int, default=25, help="Max reviews de scrape-uit")
    p_shop.add_argument("--output", default="output", help="Director output")
    p_shop.add_argument("--proxy", default=None, help="Proxy URL (opțional)")
    p_shop.set_defaults(func=cmd_shop)

    # listing
    p_listing = sub.add_parser("listing", help="Scrapează un listing")
    p_listing.add_argument("listing_url", help="URL listing sau ID numeric")
    p_listing.add_argument("--output", default="output", help="Director output")
    p_listing.add_argument("--proxy", default=None, help="Proxy URL")
    p_listing.set_defaults(func=cmd_listing)

    # search
    p_search = sub.add_parser("search", help="Scrapează căutare")
    p_search.add_argument("query", help="Query de căutare")
    p_search.add_argument("--pages", type=int, default=1, help="Număr pagini")
    p_search.add_argument("--output", default="output", help="Director output")
    p_search.add_argument("--proxy", default=None, help="Proxy URL")
    p_search.set_defaults(func=cmd_search)

    # full
    p_full = sub.add_parser("full", help="Shop complet: shop + listings + reviews")
    p_full.add_argument("shop_name", help="Numele shop-ului")
    p_full.add_argument("--max-listings", type=int, default=50, help="Max listing-uri")
    p_full.add_argument("--max-reviews", type=int, default=50, help="Max reviews")
    p_full.add_argument("--output", default="output", help="Director output")
    p_full.add_argument("--proxy", default=None, help="Proxy URL")
    p_full.set_defaults(func=cmd_full)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    import re
    main()
