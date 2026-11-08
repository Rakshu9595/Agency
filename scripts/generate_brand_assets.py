import os
import numpy as np
from PIL import Image

SRC_PATH = r"C:\Users\piyus\.gemini\antigravity\brain\8ad4e1f5-1c16-42bc-935c-16919ea46e6f\.user_uploaded\media_1794131441670_4653cf8e.jpg"
if not os.path.exists(SRC_PATH):
    SRC_PATH = r"C:\Users\piyus\.gemini\antigravity\brain\tempmediaStorage\media_1794131957153_c857a5b4.jpg"

OUT_DIR = "frontend/assets/images"
ICON_DIR = "frontend/assets/icons"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ICON_DIR, exist_ok=True)

img_rgb = Image.open(SRC_PATH).convert("RGB")
w_orig, h_orig = img_rgb.size
arr_rgb = np.array(img_rgb, dtype=np.float32)

# Calculate transparency: background is pure white (255, 255, 255).
# Luminance calculation
luminance = 0.299 * arr_rgb[:, :, 0] + 0.587 * arr_rgb[:, :, 1] + 0.114 * arr_rgb[:, :, 2]

# Alpha: 255 when dark, 0 when white
# Smooth alpha ramp for anti-aliasing without white halo
alpha = 255.0 - luminance
alpha = np.clip(alpha, 0, 255)

# For black elements (wreath and 'Pravyuk'), color should be #171717 (primary brand text) or pure black
# For the tagline, preserve its original elegant medium tone (#66645F)
# Let's inspect original RGB for foreground pixels
# If original luminance is high (> 248), fully transparent
alpha[luminance >= 252] = 0.0

# Create standard black logo on transparent background
logo_black = np.zeros((h_orig, w_orig, 4), dtype=np.uint8)
# Color channels: use #171717 (R:23, G:23, B:23)
logo_black[:, :, 0] = 23
logo_black[:, :, 1] = 23
logo_black[:, :, 2] = 23
logo_black[:, :, 3] = alpha.astype(np.uint8)

# Tagline area (y ~ 545 to 610, x ~ 260 to 780): keep slightly softer color #66645F (102, 100, 95)
mask_tagline = (np.arange(h_orig)[:, None] >= 545) & (np.arange(h_orig)[:, None] <= 610) & \
               (np.arange(w_orig)[None, :] >= 260) & (np.arange(w_orig)[None, :] <= 790) & (alpha > 10)
logo_black[mask_tagline, 0] = 102
logo_black[mask_tagline, 1] = 100
logo_black[mask_tagline, 2] = 95

img_black_trans = Image.fromarray(logo_black, mode="RGBA")

# Crop to content with a clean margin
bbox = img_black_trans.getbbox()
print("Logo content bounding box:", bbox)
cropped_black = img_black_trans.crop(bbox)

# Add 40px margin around cropped
pad = 40
padded_w = cropped_black.width + pad * 2
padded_h = cropped_black.height + pad * 2
full_logo_trans = Image.new("RGBA", (padded_w, padded_h), (0, 0, 0, 0))
full_logo_trans.paste(cropped_black, (pad, pad), cropped_black)

# Save full brand logo transparent
full_logo_trans.save(os.path.join(OUT_DIR, "pravyuk-logo.png"), "PNG")
print("Saved pravyuk-logo.png", full_logo_trans.size)

# Create white/light version for dark backgrounds
logo_white = np.zeros((h_orig, w_orig, 4), dtype=np.uint8)
logo_white[:, :, 0] = 250  # #FAF9F6
logo_white[:, :, 1] = 249
logo_white[:, :, 2] = 246
logo_white[:, :, 3] = alpha.astype(np.uint8)
# Tagline in light mode: #D6D1C7
logo_white[mask_tagline, 0] = 214
logo_white[mask_tagline, 1] = 209
logo_white[mask_tagline, 2] = 199

img_white_trans = Image.fromarray(logo_white, mode="RGBA")
cropped_white = img_white_trans.crop(bbox)
full_logo_white = Image.new("RGBA", (padded_w, padded_h), (0, 0, 0, 0))
full_logo_white.paste(cropped_white, (pad, pad), cropped_white)
full_logo_white.save(os.path.join(OUT_DIR, "pravyuk-logo-white.png"), "PNG")
print("Saved pravyuk-logo-white.png")

# Create solid background versions (light brand palette #FAF9F6)
bg_light = Image.new("RGBA", full_logo_trans.size, (250, 249, 246, 255))
bg_light.paste(full_logo_trans, (0, 0), full_logo_trans)
bg_light.convert("RGB").save(os.path.join(OUT_DIR, "pravyuk-logo-solid-light.jpg"), "JPEG", quality=95)

# Create solid dark background version
bg_dark = Image.new("RGBA", full_logo_white.size, (23, 23, 23, 255))
bg_dark.paste(full_logo_white, (0, 0), full_logo_white)
bg_dark.convert("RGB").save(os.path.join(OUT_DIR, "pravyuk-logo-solid-dark.jpg"), "JPEG", quality=95)

# Open Graph Social Share Image (1200 x 630)
og_img = Image.new("RGB", (1200, 630), (250, 249, 246)) # Primary background #FAF9F6
# Resize logo to fit nicely in center
logo_og = full_logo_trans.copy()
logo_og.thumbnail((500, 500), Image.Resampling.LANCZOS)
ox = (1200 - logo_og.width) // 2
oy = (630 - logo_og.height) // 2
og_img.paste(logo_og, (ox, oy), logo_og)
og_img.save(os.path.join(OUT_DIR, "pravyuk-og.jpg"), "JPEG", quality=92)
print("Saved pravyuk-og.jpg (1200x630)")

# Extract Wordmark alone ("Pravyuk")
# Bounding box for "Pravyuk"
# Let's locate the letters "Pravyuk":
# In logo_black: y from ~360 to ~535, x from ~260 to ~770
wordmark_crop = img_black_trans.crop((260, 365, 775, 540))
w_bbox = wordmark_crop.getbbox()
if w_bbox:
    wordmark_tight = wordmark_crop.crop(w_bbox)
    pad_wm = 15
    wm_img = Image.new("RGBA", (wordmark_tight.width + pad_wm * 2, wordmark_tight.height + pad_wm * 2), (0,0,0,0))
    wm_img.paste(wordmark_tight, (pad_wm, pad_wm), wordmark_tight)
    wm_img.save(os.path.join(OUT_DIR, "pravyuk-wordmark.png"), "PNG")
    print("Saved pravyuk-wordmark.png", wm_img.size)

    # Wordmark white
    wm_white = img_white_trans.crop((260, 365, 775, 540)).crop(w_bbox)
    wm_white_img = Image.new("RGBA", (wordmark_tight.width + pad_wm * 2, wordmark_tight.height + pad_wm * 2), (0,0,0,0))
    wm_white_img.paste(wm_white, (pad_wm, pad_wm), wm_white)
    wm_white_img.save(os.path.join(OUT_DIR, "pravyuk-wordmark-white.png"), "PNG")

# Extract Botanical Wreath Icon alone (removing the text inside)
# The wreath is in upper arc (y <= 380) and lower arc (y >= 610) and sides (x < 250 or x > 780)
wreath_only = logo_black.copy()
# Clear central text area
wreath_only[360:615, 255:785, 3] = 0
wreath_img = Image.fromarray(wreath_only, mode="RGBA")
wreath_bbox = wreath_img.getbbox()
wreath_cropped = wreath_img.crop(wreath_bbox)

# Square icon with padding
max_dim = max(wreath_cropped.width, wreath_cropped.height)
sq_pad = int(max_dim * 0.08)
sq_size = max_dim + sq_pad * 2
icon_img = Image.new("RGBA", (sq_size, sq_size), (0,0,0,0))
ix = (sq_size - wreath_cropped.width) // 2
iy = (sq_size - wreath_cropped.height) // 2
icon_img.paste(wreath_cropped, (ix, iy), wreath_cropped)
icon_img.save(os.path.join(OUT_DIR, "pravyuk-icon.png"), "PNG")
print("Saved pravyuk-icon.png", icon_img.size)

# White icon
wreath_white = logo_white.copy()
wreath_white[360:615, 255:785, 3] = 0
wreath_w_img = Image.fromarray(wreath_white, mode="RGBA").crop(wreath_bbox)
icon_white_img = Image.new("RGBA", (sq_size, sq_size), (0,0,0,0))
icon_white_img.paste(wreath_w_img, (ix, iy), wreath_w_img)
icon_white_img.save(os.path.join(OUT_DIR, "pravyuk-icon-white.png"), "PNG")

# Generate Favicons in multiple sizes
fav_sizes = [16, 32, 48, 64, 128, 180, 192, 512]
fav_images = []
for s in fav_sizes:
    fav = icon_img.resize((s, s), Image.Resampling.LANCZOS)
    fav.save(os.path.join(ICON_DIR, f"favicon-{s}x{s}.png"), "PNG")
    if s == 32:
        fav.save(os.path.join("frontend", "favicon.png"), "PNG")
        fav.save(os.path.join(OUT_DIR, "favicon.png"), "PNG")
    if s == 180:
        fav.save(os.path.join(ICON_DIR, "apple-touch-icon.png"), "PNG")
        fav.save(os.path.join("frontend", "apple-touch-icon.png"), "PNG")
    if s in [16, 32, 48]:
        fav_images.append(fav.convert("RGBA"))

# Save .ico containing 16, 32, 48
icon_img.resize((32, 32), Image.Resampling.LANCZOS).save(
    os.path.join("frontend", "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print("Saved favicon.ico and favicon pngs")

# Create Horizontal Navbar Logo:
# Botanical Wreath Emblem on left + "Pravyuk" Wordmark on right (+ subtle tagline)
# Height ~ 80px
h_target = 80
wreath_h = icon_img.resize((h_target, h_target), Image.Resampling.LANCZOS)
wm_scale = h_target / wordmark_tight.height * 0.72
wm_w = int(wordmark_tight.width * wm_scale)
wm_h = int(wordmark_tight.height * wm_scale)
wm_resized = wordmark_tight.resize((wm_w, wm_h), Image.Resampling.LANCZOS)

gap = 14
nav_logo_w = h_target + gap + wm_w + 10
nav_logo = Image.new("RGBA", (nav_logo_w, h_target), (0,0,0,0))
nav_logo.paste(wreath_h, (0, 0), wreath_h)
nav_logo.paste(wm_resized, (h_target + gap, (h_target - wm_h) // 2), wm_resized)
nav_logo.save(os.path.join(OUT_DIR, "pravyuk-logo-horizontal.png"), "PNG")
print("Saved pravyuk-logo-horizontal.png", nav_logo.size)

# White Horizontal Navbar Logo
wreath_h_w = icon_white_img.resize((h_target, h_target), Image.Resampling.LANCZOS)
wm_white_resized = wm_white.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
nav_logo_white = Image.new("RGBA", (nav_logo_w, h_target), (0,0,0,0))
nav_logo_white.paste(wreath_h_w, (0, 0), wreath_h_w)
nav_logo_white.paste(wm_white_resized, (h_target + gap, (h_target - wm_h) // 2), wm_white_resized)
nav_logo_white.save(os.path.join(OUT_DIR, "pravyuk-logo-horizontal-white.png"), "PNG")
print("Saved pravyuk-logo-horizontal-white.png")

print("All raster logo assets generated successfully!")
