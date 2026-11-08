import os
import glob
import re

PAGE_DIR = "frontend/pages"
html_files = glob.glob(os.path.join(PAGE_DIR, "*.html"))

replacements = [
    ("https://xevruniq.com", "https://pravyuk.com"),
    ("http://xevruniq.com", "https://pravyuk.com"),
    ("hello@xevruniq.com", "hello@pravyuk.com"),
    ("support@xevruniq.com", "support@pravyuk.com"),
    ("twitter.com/xevruniq", "twitter.com/pravyuk"),
    ("github.com/xevruniq", "github.com/pravyuk"),
    ("linkedin.com/company/xevruniq", "linkedin.com/company/pravyuk"),
    ("xevruniq-og.jpg", "pravyuk-og.jpg"),
    ("assets/images/logo.png", "assets/images/pravyuk-logo.png"),
    ("Xevruniq", "Pravyuk"),
    ("XEVRUNIQ", "PRAVYUK"),
    ("xevruniq", "pravyuk"),
]

favicon_block = """  <!-- Favicon & Brand Icons -->
  <link rel="icon" type="image/svg+xml" href="../assets/icons/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/icons/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/icons/apple-touch-icon.png" />
  <link rel="shortcut icon" href="../favicon.ico" />"""

font_pattern = re.compile(r'<link\s+href="https://fonts\.googleapis\.com/css2\?family=Inter[^"]*"\s+rel="stylesheet"\s*/>')
new_font = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />'

updated_count = 0

for file_path in html_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    for old, new in replacements:
        content = content.replace(old, new)

    # Replace fonts to include Playfair Display
    content = font_pattern.sub(new_font, content)

    # Ensure favicon block is present in head
    if "favicon.svg" not in content and "</head>" in content:
        content = content.replace("</head>", f"{favicon_block}\n</head>")

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        updated_count += 1
        print(f"Updated: {os.path.basename(file_path)}")

print(f"Total pages updated: {updated_count}/{len(html_files)}")
