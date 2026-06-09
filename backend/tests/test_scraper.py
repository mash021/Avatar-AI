from unittest.mock import MagicMock, patch

from app.services.scraper_service import _extract_text_from_html, scrape_page


SAMPLE_HTML = """
<html>
  <head><title>Example Company</title></head>
  <body>
    <nav>Menu</nav>
    <main>
      <h1>About Us</h1>
      <p>We provide excellent services to our customers worldwide.</p>
    </main>
    <script>console.log('x')</script>
  </body>
</html>
"""


def test_extract_text_from_html():
    text = _extract_text_from_html(SAMPLE_HTML, "https://example.com")
    assert "About Us" in text
    assert "excellent services" in text
    assert "console.log" not in text


@patch("app.services.scraper_service._fetch_with_httpx")
def test_scrape_page(mock_fetch):
    mock_fetch.return_value = SAMPLE_HTML
    section = scrape_page("https://example.com")
    assert "Example Company" in section.text or "About Us" in section.text
    assert section.metadata["url"] == "https://example.com"
