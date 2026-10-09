"""Read-only integrity check for the frozen, claim-by-claim source audit."""
from pathlib import Path
import collections
import json

root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text())
allowed = {"confirmed", "contradicted", "unresolved", "not_factual"}
counts = collections.Counter()

for entry in manifest:
    key = entry["key"]
    inventory = json.loads((root / entry["inventory"]).read_text())
    expected = {f["fieldId"]: f for r in inventory["records"] for f in r["fields"]}
    report = json.loads((root / f"{key}.json").read_text())
    rows = report["fieldAudits"]
    actual = [r["fieldId"] for r in rows]
    assert len(actual) == len(set(actual)), f"{key}: duplicate fields"
    assert set(actual) == set(expected), f"{key}: missing/extra fields"
    assert report["snapshot"] == inventory["snapshot"], f"{key}: snapshot mismatch"
    claims_seen = set()
    subtotal = collections.Counter()
    for row in rows:
        assert row["path"] == expected[row["fieldId"]]["path"], row["fieldId"]
        assert row["claims"], f"{row['fieldId']}: no claims"
        for claim in row["claims"]:
            assert claim["claimId"] not in claims_seen, claim["claimId"]
            claims_seen.add(claim["claimId"])
            assert claim["verdict"] in allowed, claim["claimId"]
            assert claim["claim"].strip(), claim["claimId"]
            pages = claim.get("sourcePages", [])
            assert all(isinstance(p, int) and 1 <= p <= entry["sourcePages"] for p in pages), claim["claimId"]
            if claim["verdict"] == "confirmed":
                external = claim.get("externalEvidence", {})
                absence_review = claim.get("evidenceType") == "full_source_absence_review" and claim.get("reason") and claim.get("inspectedSourcePages")
                assert claim.get("sourceQuote", "").strip() or absence_review, f"{claim['claimId']}: missing source quote or scoped absence review"
                assert pages or ("officialWebsites" in row["path"] and external.get("url") and external.get("retrieved")), f"{claim['claimId']}: missing source evidence"
            elif claim["verdict"] in {"contradicted", "unresolved"}:
                assert claim.get("reason"), f"{claim['claimId']}: missing explanation"
            subtotal[claim["verdict"]] += 1
    assert report.get("uiTemplateAudits"), f"{key}: no template audit"
    assert report.get("derivedAudits"), f"{key}: no derived audit"
    for group in ("uiTemplateAudits", "derivedAudits"):
        for row in report[group]:
            for claim in row.get("claims", [row]):
                assert claim["verdict"] in allowed, (key, group)
    counts.update(subtotal)
    print(f"{key}: {len(rows)} fields, {sum(subtotal.values())} claims; {dict(subtotal)}")

cases = json.loads((root / "email-cases-source-review.json").read_text())["caseAudits"]
ids = [c["questionId"] for c in cases]
assert len(ids) == len(set(ids)) == 97
assert set(ids) == {f"uncertainty-{i:03d}" for i in range(1, 98)}
for case in cases:
    assert case["answer"] and case["classification"] and case.get("evidence")
    if case["classification"] in {"conflicting_source_requires_authority", "unreadable_requires_clearer_source", "missing_source_requires_new_current_document"}:
        assert case.get("pendingQuestion") and case.get("authority"), case["questionId"]
print(f"TOTAL: {sum(e['displayFields'] for e in manifest)} fields, {sum(counts.values())} claims; {dict(counts)}")
print("Email reconciliation: all 97 unique cases covered.")
