# E-PRTR Industry Comparison Design

This note records how the app uses raw E-PRTR CSV data from `Varberg-Hackathon/hackathon_data/eprtr_raw/`.

## Raw File Discovery

The app discovers raw CSV files with:

```ts
import.meta.glob('../../Varberg-Hackathon/hackathon_data/eprtr_raw/*.csv', {
  eager: true,
  import: 'default',
  query: '?url',
})
```

No pollution categories, pollutant lists, or waste views are maintained as fixed data lists in the app.

## Industry Names

The industry dropdown is the alphabetical union of non-empty `EPRTR_SectorName` values across all discovered raw CSV files.

## Category Discovery

Pollution categories are derived from raw filenames:

- File prefixes such as `F1_2_` are removed.
- Suffixes such as `_Sector` and `_Facilities` are removed.
- The remaining filename stem becomes the category id and display label.

Examples from the current raw directory:

- `F1_2_Air_Releases_Sector.csv` and `F1_4_Air_Releases_Facilities.csv` both become `Air releases`.
- `F2_4_Water_Releases_Facilities.csv` becomes `Water releases`.
- `F3_2_Transfers_Facilities.csv` becomes `Transfers`.
- `F4_2_WasteTransfers_Facilities.csv` becomes `Waste transfers`.

## Metric Discovery

Metric options are derived from row data:

- If a file has `Pollutant`, the metric dropdown uses distinct pollutant values.
- If a file does not have `Pollutant`, the app derives metrics from the value column and related `waste...` dimension columns.
- For waste transfer rows, this creates options from actual values such as `Waste transfers`, `Waste treatment: Recovery`, `Waste treatment: Disposal`, `Waste classification: HW`, and `Waste classification: NONHW`.

## Calculation Rules

For each selected industry pair, category, and metric, the app calculates:

- Yearly trend for the latest 10 reporting years available for that metric.
- Average annual amount for each industry.
- Reporting facility count for each industry.
- Representative mapped facilities, prioritised by largest reported amount.

When a category has both sector-level and facility-level files, sector-level rows provide trend totals and facility-level rows provide facility counts and map points. When a category only has facility-level files, facility rows provide both trend values and facility details.

## Unit Handling

The raw files do not include a per-row unit column. The app displays selected metrics as `t/year`:

- `Releases` and `transfers` values are converted from raw reported kilograms to tonnes by dividing by 1,000.
- `wasteTransfers` values are used as reported tonnes.

This keeps comparisons readable, but pollutant-specific regulatory interpretation should still check the original E-PRTR metadata.
