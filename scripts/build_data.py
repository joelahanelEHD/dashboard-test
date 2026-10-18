"""Rebuild data.js from data/student_data.csv.

Usage (from the repo root):  python3 scripts/build_data.py

The CSV needs the columns Student_ID, Section, Evidence, Systems_Reasoning,
Stakeholder_Analysis, Recommendation. Section can be "Section 1" or just 1.
"""
import csv, json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
rows = []
with open(root / "data" / "student_data.csv", newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        rows.append([
            r["Student_ID"],
            int(str(r["Section"]).split()[-1]),
            int(float(r["Evidence"])),
            int(float(r["Systems_Reasoning"])),
            int(float(r["Stakeholder_Analysis"])),
            int(float(r["Recommendation"])),
        ])

body = ",\n ".join(json.dumps(r) for r in rows)
(root / "data.js").write_text(
    "// Generated from data/student_data.csv by scripts/build_data.py. Synthetic workshop data.\n"
    "// Row format: [Student_ID, Section, Evidence, Systems_Reasoning, Stakeholder_Analysis, Recommendation]\n"
    f"window.STUDENT_ROWS = [{body}];\n",
    encoding="utf-8",
)
print(f"Wrote data.js with {len(rows)} students")
