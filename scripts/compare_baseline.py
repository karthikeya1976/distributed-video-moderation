#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/compare_baseline.py — CI regression gate.

Parses JUnit XML test results (from pytest and/or vitest) and compares them
against .ci/baseline-results.json — the last-known-good test outcomes from
`main`. Blocks the PR only on NEW regressions (a test that passed on main
but fails on this branch), so pre-existing flaky/known-broken tests don't
make the repo permanently unmergeable.

Usage:
  python scripts/compare_baseline.py --results results/ --baseline .ci/baseline-results.json

Exit code 0 = no new regressions, 1 = new regressions found.
"""
import sys
import json
import argparse
from pathlib import Path
from xml.etree import ElementTree as ET

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def parse_junit(path: Path) -> dict[str, str]:
    """Return {test_id: 'pass'|'fail'} for every <testcase> in a JUnit XML file."""
    tree = ET.parse(path)
    root = tree.getroot()
    tests = {}
    for case in root.iter("testcase"):
        classname = case.get("classname", "")
        name = case.get("name", "")
        test_id = f"{classname}::{name}"
        skipped = case.find("skipped") is not None
        if skipped:
            continue  # skipped tests don't count either way
        failed = case.find("failure") is not None or case.find("error") is not None
        tests[test_id] = "fail" if failed else "pass"
    return tests


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True, help="Directory containing *.xml JUnit reports")
    ap.add_argument("--baseline", required=True, help="Path to baseline-results.json")
    args = ap.parse_args()

    results_dir = Path(args.results)
    xml_files = sorted(results_dir.glob("*.xml"))

    if not xml_files:
        print(f"No JUnit XML files found in {results_dir} — nothing to compare.")
        print("(This likely means the test job itself failed to produce output — treat as a failure.)")
        return 1

    current: dict[str, str] = {}
    for xml_file in xml_files:
        try:
            current.update(parse_junit(xml_file))
        except ET.ParseError as e:
            print(f"MALFORMED JUnit XML: {xml_file} ({e})")
            return 1

    baseline_path = Path(args.baseline)
    baseline: dict[str, str] = json.loads(baseline_path.read_text()) if baseline_path.exists() else {}

    new_failures = []
    fixed = []
    pre_existing_failures = []

    for test_id, status in current.items():
        base_status = baseline.get(test_id, "pass")  # a brand-new test must pass
        if status == "fail" and base_status != "fail":
            new_failures.append(test_id)
        elif status == "fail" and base_status == "fail":
            pre_existing_failures.append(test_id)
        elif status == "pass" and base_status == "fail":
            fixed.append(test_id)

    total = len(current)
    total_failing = sum(1 for s in current.values() if s == "fail")

    print(f"Total tests: {total}, failing: {total_failing}")

    if fixed:
        print(f"\nFixed since baseline ({len(fixed)}):")
        for t in fixed:
            print(f"  + {t}")

    if pre_existing_failures:
        print(f"\nPre-existing failures (already failing on main, not blocking):")
        for t in pre_existing_failures:
            print(f"  ~ {t}")

    if new_failures:
        print(f"\nNEW REGRESSIONS ({len(new_failures)}) — these passed on main, now fail:")
        for t in new_failures:
            print(f"  - {t}")
        print("\nRegression gate FAILED.")
        return 1

    print("\nNo new regressions vs. baseline. Regression gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
