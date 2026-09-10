#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/generate_baseline.py — regenerates .ci/baseline-results.json from
the current test suite's JUnit output.

Run this on `main` after tests pass (the merge workflow does this
automatically post-merge) so future PRs are compared against an
up-to-date "last known good" snapshot rather than a stale one.

Usage:
  python scripts/generate_baseline.py --results results/ --out .ci/baseline-results.json
"""
import sys
import json
import argparse
from pathlib import Path
from xml.etree import ElementTree as ET

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def parse_junit(path: Path) -> dict[str, str]:
    tree = ET.parse(path)
    root = tree.getroot()
    tests = {}
    for case in root.iter("testcase"):
        test_id = f'{case.get("classname", "")}::{case.get("name", "")}'
        if case.find("skipped") is not None:
            continue
        failed = case.find("failure") is not None or case.find("error") is not None
        tests[test_id] = "fail" if failed else "pass"
    return tests


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    results_dir = Path(args.results)
    combined: dict[str, str] = {}
    for xml_file in sorted(results_dir.glob("*.xml")):
        combined.update(parse_junit(xml_file))

    if not combined:
        print(f"No test results found in {results_dir} — refusing to write an empty baseline.")
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(combined, indent=2, sort_keys=True) + "\n")

    failing = sum(1 for s in combined.values() if s == "fail")
    print(f"Wrote baseline: {len(combined)} tests ({failing} failing) -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
