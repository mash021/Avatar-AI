import logging
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.services.parser import ParsedSection

logger = logging.getLogger(__name__)
settings = get_settings()

STRIP_TAGS = {"script", "style", "nav", "footer", "header", "noscript", "svg"}


def _extract_text_from_html(html: str, page_url: str) -> str:
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(STRIP_TAGS):
        tag.decompose()

    title = soup.title.get_text(strip=True) if soup.title else ""
    main = soup.find("main") or soup.find("article") or soup.body
    body_text = main.get_text("\n", strip=True) if main else soup.get_text("\n", strip=True)

    parts = []
    if title:
        parts.append(title)
    if body_text:
        parts.append(body_text)

    return "\n\n".join(parts)


def _fetch_with_httpx(url: str) -> str:
    with httpx.Client(
        timeout=settings.scraper_timeout_seconds,
        follow_redirects=True,
        headers={"User-Agent": "AI-Avatar-Bot/1.0"},
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def _fetch_with_playwright(url: str) -> str:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(url, wait_until="networkidle", timeout=settings.scraper_timeout_seconds * 1000)
            return page.content()
        finally:
            browser.close()


def scrape_page(url: str, use_playwright: bool = False) -> ParsedSection:
    html = ""
    if use_playwright:
        html = _fetch_with_playwright(url)
    else:
        try:
            html = _fetch_with_httpx(url)
        except Exception:
            if settings.scraper_use_playwright:
                html = _fetch_with_playwright(url)
            else:
                raise

    soup = BeautifulSoup(html, "lxml")
    title = soup.title.get_text(strip=True) if soup.title else ""
    text = _extract_text_from_html(html, url)
    return ParsedSection(
        text=text,
        metadata={"url": url, "title": title},
    )


def scrape_website(start_url: str, depth: int = 1) -> list[ParsedSection]:
    parsed_start = urlparse(start_url)
    base_domain = parsed_start.netloc
    visited: set[str] = set()
    to_visit: list[tuple[str, int]] = [(start_url, 0)]
    sections: list[ParsedSection] = []

    while to_visit:
        url, current_depth = to_visit.pop(0)
        normalized = url.rstrip("/")
        if normalized in visited:
            continue
        visited.add(normalized)

        try:
            section = scrape_page(url, use_playwright=False)
            if section.text.strip():
                section.metadata["depth"] = current_depth
                sections.append(section)
        except Exception as exc:
            logger.warning("Failed to scrape %s: %s", url, exc)
            continue

        if current_depth >= depth:
            continue

        try:
            html = _fetch_with_httpx(url)
            soup = BeautifulSoup(html, "lxml")
            for link in soup.find_all("a", href=True):
                href = urljoin(url, link["href"])
                link_parsed = urlparse(href)
                if link_parsed.netloc != base_domain:
                    continue
                if link_parsed.scheme not in {"http", "https"}:
                    continue
                clean = href.split("#")[0].rstrip("/")
                if clean and clean not in visited:
                    to_visit.append((clean, current_depth + 1))
        except Exception as exc:
            logger.warning("Failed to discover links on %s: %s", url, exc)

    return sections
