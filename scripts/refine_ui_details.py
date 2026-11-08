import glob

files = glob.glob('frontend/pages/*.html')
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()
    orig = c
    c = c.replace('breadcrumb-item active text-white', 'breadcrumb-item active text-dark')
    if c != orig:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(c)
        print(f"Refined breadcrumbs in: {f}")

print("Breadcrumb refinement complete.")
