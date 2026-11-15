# Hospitalised Road Crash Injuries in Australia (2011–2021)

COS30045 Data Visualisation, Group 7.

A dashboard of five pages. Every page fits on one screen, with no scrolling.

## How to run
Open the folder in VS Code and start it with the Live Server extension (right-click `index.html`, then "Open with Live Server"). Opening `index.html` by double-clicking also works, but the charts then use a copy of the data built into `js/common.js`.

## Pages
- `index.html`: Overview. How has it changed, who is hit hardest, who is hurt most seriously. Linked charts.
- `trends.html`: Year by year. Change from the previous year, and average stay per case.
- `compare.html`: Compare. Share of cases, and a head to head of any two road users.
- `data.html`: Data. Sortable table, data notes, a check that the two files agree, and CSV downloads.
- `about.html`: About. Project, team, tools, and the reasons for the colour, font, layout and chart choices.

## Folder structure
- `css/style.css`: styles. Theme colours are at the top of this file.
- `js/effects.js`: small helpers (count-up numbers, header photo fade).
- `js/charts.js`: the D3 charts (line, year-on-year bars, bars, bubble, donut).
- `js/common.js`: loads and checks the data files (skips rows with missing values), shared helpers.
- `js/overview.js`, `trends.js`, `compare.js`, `data.js`: the code for each page.
- `data/`: cleaned CSV files from KNIME.
- `photos/`: images for the header.

## Colour system
The burgundy background is non-data framing. Three Okabe–Ito Colour Universal Design hues encode distinct measures consistently: cases = sky blue (`#56B4E9`), bed days = orange (`#E69F00`), bed days per case = bluish green (`#009E73`). The five road-user categories use distinct qualitative hues, with neutral light grey for “All others”. Line style and signed year-on-year labels provide non-colour cues. Contrast calculations and research basis appear on `about.html`. Theme values are centralized in `css/style.css`; D3 charts resolve them using CSS custom properties.

Sources: Okabe & Ito (https://jfly.uni-koeln.de/color/), ColorBrewer (https://colorbrewer2.org/), WCAG 2.2 (https://www.w3.org/TR/WCAG22/). This is a colour-system revision; it is not a complete accessibility certification.

## Data
BITRE Hospitalised Injury Data (AIHW National Hospital Morbidity Database, ICD-10-AM), 2011–2021, cleaned in KNIME.

## GenAI declaration
This code was written with the assistance of Claude (Anthropic) and reviewed and adapted by the team.
