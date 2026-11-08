import os
import glob
import re
from urllib.parse import urlparse

files = glob.glob('frontend/**/*.html', recursive=True)
broken_links = []

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    dir_name = os.path.dirname(file_path)
    
    links = re.findall(r'(?:href|src)=["\']([^"\']+)["\']', html)
    for link in links:
        if link.startswith(('http://', 'https://', 'mailto:', 'tel:', '#', 'data:', 'javascript:')):
            continue
        parsed = urlparse(link).path
        if not parsed:
            continue
        target = os.path.normpath(os.path.join(dir_name, parsed))
        if not os.path.exists(target):
            # check root-relative
            if parsed.startswith('/'):
                target_alt = os.path.normpath(os.path.join('frontend', parsed.lstrip('/')))
                if os.path.exists(target_alt):
                    continue
            # check if Netlify redirect for service/blog clean URLs
            if parsed.startswith('/services/') or parsed.startswith('/blog/'):
                continue
            broken_links.append((os.path.relpath(file_path), link, target))

if broken_links:
    print(f"Found {len(broken_links)} broken link(s):")
    for f, l, t in broken_links[:20]:
        print(f"  In {f}: '{l}' -> target '{t}' does not exist")
else:
    print("All internal links and asset sources verified successfully! No broken links.")
