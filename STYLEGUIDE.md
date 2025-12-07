# Style Guide

This short style guide documents the type, color tokens and brand usage for the portfolio landing page.

## Fonts
- Headings: `Merriweather` (serif) — used for `h1`, `h2`, `h3`.
- Body/UI: `Inter` (sans-serif) — used for body copy and UI elements.
- Logo: `Poppins` (display) — used for the logo text and badges.

## Color Tokens
 - `--accent`: Classic Blue (Pantone 19-4052) — #0F4C81
 - `--accent-2`: Living Coral (Pantone 16-1546) — #FF6F61
 - `--accent-3`: Ultra Violet (Pantone-like) — #5F4B8B
`--accent-4`: Gold tone — #F59E0B
`--brand-pink`: Elementor pink — #EC4899
`--accent-gradient`: Legacy token — maps to `--accent` (kept for compatibility)
`--pantone-gradient`: Legacy alias — maps to the primary accent; the site uses solid tokens rather than gradients
- `--brand-success`: Success color — #10B981
- `--brand-error`: Error color — #DC2626
- `--text`: Body text — #0B1220
- `--muted`: Muted / text helper — #6B7280
- `--bg`: Page background — #F6F8FA
- `--paper`: Card / surface background — #FFFFFF

## Spacing & Tokens
- `--container`: 1200px
- `--gap`: 24px
- `--radius`: 12px
- `--transition`: 200ms

## Logo
- The logo uses a small rounded-square mark with the initials (`.logo-mark`) using the primary accent and white text.
- The logo text (`.logo-text`) is set in `Poppins` for a modern, geometric display.
 - The recommended logo variant is `logo-mark` + `logo-text` (initials mark + full name). Use 42x42 mark with 10px radius.
 - Avoid replacing the mark's accent gradient with low-contrast single colors. If using a single color variant, ensure adequate contrast and whitespace.

## Usage
- Use `--accent` for primary CTAs; use `--accent-hover` on hover. This site favors solid color tokens for accessibility and consistency.
- Use `--brand-success` for success states and `--brand-error` for errors in forms and notifications
 - Use `.about-bubbles` and `.bubble` to represent skills or quick features. Give them `data-variant` attributes to apply alternative Pantone tones.
	 - Example: `<button class="bubble" data-variant="coral">WooCommerce</button>`

## Notes
- These tokens are defined in `css/style.css` under `:root` and should be the single source of truth for colors and spacing.
- To add more tokens, extend the `:root` list and update any styles referencing hard-coded values.

## Projects (data/projects.json)
- The portfolio grid is data-driven: `data/projects.json` contains an array of project objects. The front-end fetches this file at runtime and renders a card for each entry.
- Simple example:

```json
{
	"id": "project-example",
	"category": "elementor",
	"title": "Example Project",
	"desc": "Short description",
	"tech": ["Elementor","Accessibility"],
	"screenshots": ["/screens/one.jpg", "/screens/two.jpg"],
	"image": "/screens/preview.jpg",
	"live": "https://example.com",
	"badges": ["elementor"]
}
```

Add, modify, or remove entries in `data/projects.json` to keep the portfolio up to date. Remember this file is fetched via an HTTP request — run a local server (e.g., Live Server) or host your site for `fetch` to work.
