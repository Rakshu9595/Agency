import glob
import os
import re
import json

html_files = glob.glob('frontend/**/*.html', recursive=True)

seo_issues = []
private_pages = {
    'admin.html', 'dashboard.html', 'billing.html', 'login.html',
    'register.html', 'forgot-password.html', 'reset-password.html',
    'payment-success.html', 'payment-failure.html'
}

checked_count = 0

for file_path in html_files:
    filename = os.path.basename(file_path)
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()

    checked_count += 1
    rel_path = os.path.relpath(file_path)

    # 1. Title check
    title_match = re.search(r'<title>(.*?)</title>', html, re.DOTALL | re.IGNORECASE)
    if not title_match:
        seo_issues.append((rel_path, "Missing <title> tag"))
    else:
        title = title_match.group(1).strip()
        if "pravyuk" not in title.lower():
            seo_issues.append((rel_path, f"Title does not mention Pravyuk: '{title}'"))

    # 2. Meta description check
    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not desc_match:
        # Check reverse order
        desc_match = re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']description["\']', html, re.IGNORECASE)
    
    if not desc_match and filename not in private_pages and filename != '404.html':
        seo_issues.append((rel_path, "Missing meta description"))

    # 3. Canonical check for public pages
    if filename not in private_pages and filename != '404.html':
        canonical_match = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not canonical_match:
            seo_issues.append((rel_path, "Missing canonical link"))
        else:
            canonical = canonical_match.group(1)
            if "xevruniq" in canonical:
                seo_issues.append((rel_path, f"Old domain in canonical: {canonical}"))

    # 4. Private pages noindex check
    if filename in private_pages:
        robots_match = re.search(r'<meta\s+name=["\']robots["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not robots_match or "noindex" not in robots_match.group(1):
            seo_issues.append((rel_path, f"Private page missing noindex: {robots_match.group(1) if robots_match else 'None'}"))

    # 5. JSON-LD structured data validation
    json_ld_matches = re.findall(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
    for idx, block in enumerate(json_ld_matches):
        try:
            data = json.loads(block.strip())
            # ensure no xevruniq in json-ld
            block_str = json.dumps(data)
            if "xevruniq" in block_str.lower():
                seo_issues.append((rel_path, f"Old brand in JSON-LD block {idx}"))
        except Exception as e:
            seo_issues.append((rel_path, f"Invalid JSON-LD syntax in block {idx}: {str(e)}"))

if seo_issues:
    print(f"Found {len(seo_issues)} SEO / metadata issue(s):")
    for r, issue in seo_issues:
        print(f"  [{r}] {issue}")
else:
    print(f"All {checked_count} pages passed SEO validation, title, meta description, canonical, and structured data checks!")
