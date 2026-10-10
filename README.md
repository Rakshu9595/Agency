
# Agenet Frontend

A complete static frontend for a software agency website.

## Run locally

```bash
cd frontend
python -m http.server 8000
```

Open http://localhost:8000

## Structure

- `index.html` � homepage
- `pages/*.html` � other pages
- `css/*.css` � styles
- `js/*.js` � utilities and page scripts
- `data/*.js` � reusable structured content

## Backend note

This frontend is designed to connect to an existing Node.js + Express backend. Configure `js/config.js` before use.
