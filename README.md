# SHI Decarbonisation Sandbox

This is a React, JavaScript and Tailwind CSS MVP that shows how a controlled energy and carbon baseline can support decarbonisation scenario planning, Finance-ready investment decisions and target tracking.

The app uses seeded SHI sustainability reporting context with editable site, target, scenario, measure and finance assumptions.

## Features

- BAU scenario setup from 2025 to 2050.
- SBTi-style 2030 and 2050 target records split by Scope 1, Scope 2 and a Scope 3 placeholder.
- Low-effort and high-investment scenario comparison.
- Add, edit, duplicate and delete energy-indicator-specific measures.
- Scope 1 and Scope 2 location-based operational emissions projections.
- Energy cost trajectory and target-gap summary cards.
- Capex, opex, avoided energy cost, internal carbon price value and payback.
- MACC bar chart and bubble investment map.
- Data and assumptions page with seeded sites, energy, emissions factors and methodology notes.
- LocalStorage persistence with a reset demo data button.

## Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## GitHub Pages

The repository includes a GitHub Actions workflow that builds the Vite app and deploys `dist` to GitHub Pages on every push to `main`.

The app is configured for the project page path:

```text
https://adarbayev.github.io/SHI-DEMO/
```

## Calculation Assumptions

- BAU electricity and fuel demand are projected using annual growth rates plus any site expansion factor.
- Energy prices escalate using the configured annual price escalation rate.
- Scope 2 location-based emissions use seeded country electricity factors with annual grid decarbonisation.
- Scope 1 emissions use fixed seeded natural gas, diesel and petrol factors.
- Target pathway outputs sum modelled Scope 1 and Scope 2 target records; Scope 3 rows are visible placeholders until Scope 3 activity data is added.
- Measures phase in from the configured start year and stop at the end of useful life.
- Solar PV reduces purchased electricity. Electrification reduces fuel and adds electricity demand.
- MACC uses annualised capex, annual opex change, avoided energy cost and optional carbon price value.

## Known Limitations

- No backend, authentication, multi-user approval flow or production audit controls.
- No live integration with BMS, DCIM, utility, Atrius or Finance systems.
- Scope 2 market-based accounting is represented as future scope, not a full accounting engine.
- Scope 3 target rows are included for structure only and do not affect emissions calculations.
