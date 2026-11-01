# Hospitalised Road Crash Injuries in Australia (2011–2021)

COS30045 Data Visualisation, Group 7.

An interactive website showing hospitalised road crash injuries in Australia: how cases and bed days changed from 2011 to 2021, and which road users are affected most.

## How to run
Open the folder in VS Code and start it with the Live Server extension (right-click `index.html`, then "Open with Live Server"). Opening `index.html` by double-clicking also works, but the charts then use a copy of the data built into `js/main.js`.

## Folder structure
- `index.html`: the page
- `css/style.css`: theme colours are at the top of this file
- `js/main.js`: loads the data, fills the page and handles the controls
- `js/effects.js`: visual effects (particle network, scroll progress, fade-ins, count-up numbers)
- `js/charts.js`: the D3 charts (line, year-on-year bars, bars, bubble, donut)
- `data/`: cleaned CSV files from KNIME
- `photos/`: images for the banner

## Data
BITRE Hospitalised Injury Data (AIHW National Hospital Morbidity Database, ICD-10-AM), 2011–2021, cleaned in KNIME.
