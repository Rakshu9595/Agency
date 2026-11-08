import os
import cv2
import numpy as np

def extract_svg_paths(img_rgba, color="#171717", min_area=15):
    alpha = img_rgba[:, :, 3]
    _, thresh = cv2.threshold(alpha, 127, 255, 0)
    contours, hierarchy = cv2.findContours(thresh, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    
    path_d_list = []
    if hierarchy is not None:
        for i, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            epsilon = 0.0008 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            pts = approx.reshape(-1, 2)
            if len(pts) < 3:
                continue
            d = f"M {pts[0][0]} {pts[0][1]} " + " ".join([f"L {p[0]} {p[1]}" for p in pts[1:]]) + " Z"
            path_d_list.append(d)
    
    combined_d = " ".join(path_d_list)
    return f'<path d="{combined_d}" fill="{color}" fill-rule="evenodd"/>'

# Load images
icon_rgba = cv2.imread("frontend/assets/images/pravyuk-icon.png", cv2.IMREAD_UNCHANGED)
h_icon, w_icon = icon_rgba.shape[:2]

wordmark_rgba = cv2.imread("frontend/assets/images/pravyuk-wordmark.png", cv2.IMREAD_UNCHANGED)
h_wm, w_wm = wordmark_rgba.shape[:2]

full_rgba = cv2.imread("frontend/assets/images/pravyuk-logo.png", cv2.IMREAD_UNCHANGED)
h_full, w_full = full_rgba.shape[:2]

OUT_DIR = "frontend/assets/images"
ICON_DIR = "frontend/assets/icons"

# 1. Botanical Wreath Icon SVG (Dark & White)
icon_path_dark = extract_svg_paths(icon_rgba, color="#171717")
icon_svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_icon} {h_icon}" width="100%" height="100%">
  {icon_path_dark}
</svg>'''

icon_path_white = extract_svg_paths(icon_rgba, color="#FAF9F6")
icon_svg_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_icon} {h_icon}" width="100%" height="100%">
  {icon_path_white}
</svg>'''

with open(os.path.join(OUT_DIR, "pravyuk-icon.svg"), "w", encoding="utf-8") as f:
    f.write(icon_svg_dark)
with open(os.path.join(OUT_DIR, "pravyuk-icon-white.svg"), "w", encoding="utf-8") as f:
    f.write(icon_svg_white)
with open(os.path.join("frontend", "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(icon_svg_dark)
with open(os.path.join(ICON_DIR, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(icon_svg_dark)

print("Saved pravyuk-icon.svg and favicon.svg")

# 2. Wordmark SVG (Dark & White)
wm_path_dark = extract_svg_paths(wordmark_rgba, color="#171717")
wm_svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_wm} {h_wm}" width="100%" height="100%">
  {wm_path_dark}
</svg>'''

wm_path_white = extract_svg_paths(wordmark_rgba, color="#FAF9F6")
wm_svg_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_wm} {h_wm}" width="100%" height="100%">
  {wm_path_white}
</svg>'''

with open(os.path.join(OUT_DIR, "pravyuk-wordmark.svg"), "w", encoding="utf-8") as f:
    f.write(wm_svg_dark)
with open(os.path.join(OUT_DIR, "pravyuk-wordmark-white.svg"), "w", encoding="utf-8") as f:
    f.write(wm_svg_white)

print("Saved pravyuk-wordmark.svg")

# 3. Full Circular Logo SVG (Dark & White)
# For full logo, we have wreath + wordmark + tagline
full_path_dark = extract_svg_paths(full_rgba, color="#171717")
full_svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_full} {h_full}" width="100%" height="100%">
  {full_path_dark}
</svg>'''

full_path_white = extract_svg_paths(full_rgba, color="#FAF9F6")
full_svg_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_full} {h_full}" width="100%" height="100%">
  {full_path_white}
</svg>'''

with open(os.path.join(OUT_DIR, "pravyuk-logo.svg"), "w", encoding="utf-8") as f:
    f.write(full_svg_dark)
with open(os.path.join(OUT_DIR, "pravyuk-logo-white.svg"), "w", encoding="utf-8") as f:
    f.write(full_svg_white)

print("Saved pravyuk-logo.svg")

# 4. Horizontal Navbar Logo SVG
# Composed with botanical wreath on left + Pravyuk serif typography on right + optional tagline
# In navbar, viewbox: 0 0 320 80
# Icon size: 76x76 at (2, 2)
# Text "Pravyuk" in Playfair / Garamond / Serif at x=90, y=50, font-size=38
# Tagline "Your Vision. Our Build." at x=92, y=68, font-size=12
nav_svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <g transform="translate(4, 2) scale({76 / w_icon})">
    {icon_path_dark}
  </g>
  <text x="94" y="47" font-family="'Playfair Display', 'Cinzel', 'Georgia', serif" font-size="34" font-weight="700" fill="#171717" letter-spacing="-0.02em">Pravyuk</text>
  <text x="96" y="66" font-family="'Inter', -apple-system, sans-serif" font-size="10.5" font-weight="500" fill="#A58A58" letter-spacing="0.12em" text-transform="uppercase">Your Vision. Our Build.</text>
</svg>'''

nav_svg_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <g transform="translate(4, 2) scale({76 / w_icon})">
    {icon_path_white}
  </g>
  <text x="94" y="47" font-family="'Playfair Display', 'Cinzel', 'Georgia', serif" font-size="34" font-weight="700" fill="#FAF9F6" letter-spacing="-0.02em">Pravyuk</text>
  <text x="96" y="66" font-family="'Inter', -apple-system, sans-serif" font-size="10.5" font-weight="500" fill="#D4AF37" letter-spacing="0.12em" text-transform="uppercase">Your Vision. Our Build.</text>
</svg>'''

with open(os.path.join(OUT_DIR, "pravyuk-logo-horizontal.svg"), "w", encoding="utf-8") as f:
    f.write(nav_svg_dark)
with open(os.path.join(OUT_DIR, "pravyuk-logo-horizontal-white.svg"), "w", encoding="utf-8") as f:
    f.write(nav_svg_white)

print("Saved pravyuk-logo-horizontal.svg (dark and white)")
