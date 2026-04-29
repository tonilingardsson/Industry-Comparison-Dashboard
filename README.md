# Industry Comparison Dashboard

Industry Comparison Dashboard is a Vite + React prototype for comparing industrial pollution data from raw E-PRTR files and related open datasets.

Original Figma source:
https://www.figma.com/design/JrvisGXGZPg1Jg4iJGODzq/Industry-Comparison-Dashboard

## Prerequisites

- Node.js 18 or newer
- npm
- Git

Check your local versions:

```bash
node --version
npm --version
git --version
```

## Required Data Folder

The app imports CSV, GeoJSON, and branding assets from a local `Varberg-Hackathon/` folder at the project root.

Expected structure:

```text
Industry Comparison Dashboard/
├── Varberg-Hackathon/
│   ├── branding/
│   └── hackathon_data/
├── src/
├── package.json
└── README.md
```

If `Varberg-Hackathon/` is missing, clone or copy it into the project root:

```bash
git clone https://github.com/ICONSOF/Varberg-Hackathon.git Varberg-Hackathon
```

## Install

From the project root:

```bash
npm install
```

## Run Locally

Start the development server:

```bash
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173
```

Open that URL in your browser.

## Build

Create a production build:

```bash
npm run build
```

The generated files are written to `dist/`.

## Common Issues

If the app fails to load data or assets, check that `Varberg-Hackathon/` exists at the project root and contains:

- `Varberg-Hackathon/branding/Icons Of colorful.png`
- `Varberg-Hackathon/hackathon_data/eprtr_raw/*.csv`
- `Varberg-Hackathon/hackathon_data/halland_skyddade_omraden.geojson`

If port `5173` is already in use, Vite will show another available port in the terminal.
