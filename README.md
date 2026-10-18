# ENV 401 Assessment Dashboard

An interactive dashboard of ENV 401 capstone rubric scores: 60 sampled students rated 1–4 on four dimensions (Evidence, Systems Reasoning, Stakeholder Analysis, Recommendation). A score of 3 or 4 counts as meeting expectations.

> The data is **synthetic workshop data**. No records represent actual students.

## What's on the dashboard

- **Section filter.** Every tile, chart and the table update for one section or for all students.
- **Key figures.** Students assessed, the share meeting expectations on all four dimensions, the lowest dimension, and Cronbach's alpha, recalculated for the current selection.
- **Percent meeting by dimension.** Includes an illustrative 80% target line.
- **Score distribution.** A diverging bar chart: scores of 1–2 to the left of the line, 3–4 to the right.
- **Section × dimension heatmap.** Click a row to filter to that section.
- **Dimensions met per student.** How many students met 0, 1, 2, 3 or all 4 dimensions.
- **Student table.** Sortable, with scores below 3 highlighted and an option to show only students below expectations.

Hover over (or tab to) any bar or cell for exact counts. The page follows the viewer's light or dark mode setting.

## View it

**Locally:** download the repo and open `index.html` in a browser. It needs no server and no install.

**Online with GitHub Pages:**
1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, then **Save**.
3. After a minute, the site appears at `https://joelahanelehd.github.io/dashboard-test/`.

Note that GitHub Pages sites are public, even if the repo is private.

## Update the data

1. Replace `data/student_data.csv` with new scores (same column names).
2. Run `python3 scripts/build_data.py` to regenerate `data.js`.
3. Commit and push. Everything on the dashboard is computed from `data.js`.

To change the target line, edit `TARGET` at the top of `app.js`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout |
| `styles.css` | Styling, including light and dark themes |
| `app.js` | Calculations and charts (plain JavaScript, no libraries) |
| `data.js` | The student scores the page reads |
| `data/student_data.csv` | Source data (the Student Data tab of the workbook) |
| `scripts/build_data.py` | Rebuilds `data.js` from the CSV |
