import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("medauth.policy_engine")

# ---------------------------------------------------------------------------
# Structured Outcome Codes (Taxonomy)
# ---------------------------------------------------------------------------
OUTCOME_COVERED = "OUTCOME_COVERED"
OUTCOME_NOT_COVERED = "OUTCOME_NOT_COVERED"
OUTCOME_EXCLUDED = "OUTCOME_EXCLUDED"
OUTCOME_CONFLICTING_EVIDENCE = "OUTCOME_CONFLICTING_EVIDENCE"
OUTCOME_INSUFFICIENT_INFORMATION = "OUTCOME_INSUFFICIENT_INFORMATION"
OUTCOME_UNKNOWN_POLICY = "OUTCOME_UNKNOWN_POLICY"
OUTCOME_MANUAL_REVIEW_REQUIRED = "OUTCOME_MANUAL_REVIEW_REQUIRED"


def parse_cost_sharing(copay: Optional[str], coinsurance: Optional[str]) -> str:
    """Parse raw copay and coinsurance strings into a human-readable summary."""
    copay_str = (copay or "").strip()
    coins_str = (coinsurance or "").strip()

    has_copay = copay_str and copay_str.lower() not in ("not applicable", "none", "nan", "")
    has_coins = coins_str and coins_str.lower() not in ("not applicable", "none", "nan", "")

    if not has_copay and not has_coins:
        return "No specific copay or coinsurance data provided (may vary by tier)."

    if has_copay and copay_str in ("$0.00", "$0") and has_coins and "0.00%" in coins_str:
        return "100% covered with $0.00 copay and 0% coinsurance."

    parts = []
    if has_copay:
        parts.append(f"Copay: {copay_str}")
    if has_coins:
        parts.append(f"Coinsurance: {coins_str}")

    return " | ".join(parts)


def _normalize_string_list(val: Any) -> List[str]:
    """Safely convert any input into a clean list of non-empty strings."""
    if val is None:
        return []
    if isinstance(val, str):
        clean = val.strip()
        return [clean] if clean else []
    if isinstance(val, (list, tuple, set)):
        result = []
        for x in val:
            if x is not None:
                s = str(x).strip()
                if s:
                    result.append(s)
        return result
    return []


def check_exclusions_overlap(
    abnormalities: Any,
    findings: Any,
    exclusions_text: Optional[str]
) -> List[str]:
    """
    Cross-check abnormalities and findings against exclusions text for keyword overlaps.
    Safely handles malformed non-list or null inputs.
    """
    if not exclusions_text or str(exclusions_text).strip().lower() in ("none", "nan", ""):
        return []

    exclusions_lower = str(exclusions_text).lower()
    conflicts: List[str] = []

    abn_list = _normalize_string_list(abnormalities)
    findings_list = _normalize_string_list(findings)

    candidates = list(abn_list) + [f for f in findings_list if len(f.split()) <= 3]
    for candidate in candidates:
        candidate_clean = candidate.strip().lower()
        if len(candidate_clean) > 2 and re.search(r"\b" + re.escape(candidate_clean) + r"\b", exclusions_lower):
            if candidate not in conflicts:
                conflicts.append(candidate)

    return conflicts


def compare_evidence_to_policy(
    evidence: Any,
    policy: Any,
    has_source_text: bool = True
) -> Dict[str, Any]:
    """
    Pure deterministic comparison of clinical evidence against a health policy.

    Args:
        evidence: dict or Evidence ORM instance containing:
                  - image_evidence (dict with 'abnormalities', 'findings', etc.)
                  - text_image_consistency (dict with 'consistent': bool)
                  - clinical_support (dict with 'supported': bool)
        policy: Policy ORM instance or dict with:
                - is_covered (str)
                - copay (str)
                - coinsurance (str)
                - limit_qty (float)
                - limit_unit (str)
                - exclusions (str)
        has_source_text: bool indicating if findings/impression were present in original data

    Returns:
        Dict containing policy_requirements_checklist, evidence_score, recommendation,
        structured outcome_code, policy_eligibility, conflict_warnings, missing_information,
        and auxiliary cost-sharing and limit summaries.
    """
    logger.info("Executing policy comparison (has_source_text=%s)", has_source_text)

    # 1. Normalize Evidence input (dict or ORM model) safely
    if hasattr(evidence, "__dict__") and not isinstance(evidence, dict):
        image_ev_raw = getattr(evidence, "image_evidence", {}) or {}
        text_consistency_raw = getattr(evidence, "text_image_consistency", {}) or {}
        clin_support_raw = getattr(evidence, "clinical_support", {}) or {}
    elif isinstance(evidence, dict):
        if "image_evidence" in evidence or "text_image_consistency" in evidence:
            image_ev_raw = evidence.get("image_evidence") or {}
            text_consistency_raw = evidence.get("text_image_consistency") or {}
            clin_support_raw = evidence.get("clinical_support") or {}
        elif "evidence" in evidence and isinstance(evidence["evidence"], dict):
            sub_ev = evidence["evidence"]
            image_ev_raw = sub_ev.get("image_evidence") or {}
            text_consistency_raw = sub_ev.get("text_image_consistency") or {}
            clin_support_raw = sub_ev.get("clinical_support") or {}
        else:
            image_ev_raw = evidence.get("image_evidence") or {}
            text_consistency_raw = evidence.get("text_image_consistency") or {}
            clin_support_raw = evidence.get("clinical_support") or {}
    else:
        image_ev_raw, text_consistency_raw, clin_support_raw = {}, {}, {}

    image_ev = image_ev_raw if isinstance(image_ev_raw, dict) else {}
    text_consistency = text_consistency_raw if isinstance(text_consistency_raw, dict) else {}
    clin_support = clin_support_raw if isinstance(clin_support_raw, dict) else {}

    # 2. Normalize Policy input safely
    if hasattr(policy, "__dict__") and not isinstance(policy, dict):
        is_covered_val = getattr(policy, "is_covered", "")
        copay_val = getattr(policy, "copay", "")
        coins_val = getattr(policy, "coinsurance", "")
        limit_qty_val = getattr(policy, "limit_qty", None)
        limit_unit_val = getattr(policy, "limit_unit", None)
        exclusions_val = getattr(policy, "exclusions", None)
        plan_id_val = getattr(policy, "plan_id", "unknown")
    elif isinstance(policy, dict):
        is_covered_val = policy.get("is_covered", "")
        copay_val = policy.get("copay", "")
        coins_val = policy.get("coinsurance", "")
        limit_qty_val = policy.get("limit_qty")
        limit_unit_val = policy.get("limit_unit")
        exclusions_val = policy.get("exclusions")
        plan_id_val = policy.get("plan_id", "unknown")
    else:
        is_covered_val, copay_val, coins_val = "", "", ""
        limit_qty_val, limit_unit_val, exclusions_val = None, None, None
        plan_id_val = "unknown"

    logger.debug("Evaluating against policy plan_id='%s', is_covered='%s'", plan_id_val, is_covered_val)

    # Tracking structures for explainability and diagnostics
    checklist: List[Dict[str, str]] = []
    conflict_warnings: List[str] = []
    missing_information: List[str] = []

    # 3. Perform Checklist Evaluations

    # (a) Source Text Grounding Check
    if not has_source_text:
        checklist.append({
            "requirement": "Source Clinical Report Grounding",
            "status": "WARNING",
            "detail": "No original findings or impression report available for grounding AI predictions. Manual verification mandatory."
        })
        missing_information.append("source_clinical_report")
    else:
        checklist.append({
            "requirement": "Source Clinical Report Grounding",
            "status": "PASS",
            "detail": "Original radiologist report text available for multimodal verification."
        })

    # (b) Benefit Coverage Check
    is_covered_clean = str(is_covered_val).strip() if is_covered_val is not None else ""
    is_covered = is_covered_clean.lower() == "covered"

    if is_covered:
        coverage_status = "PASS"
        coverage_detail = "Procedure is a covered benefit under this plan."
        policy_eligibility = "COVERED"
    elif is_covered_clean.lower() in ("not covered", "no", "non-covered", "denied"):
        coverage_status = "FAIL"
        coverage_detail = f"Procedure is explicitly NOT covered under this plan (Status: '{is_covered_clean}')."
        policy_eligibility = "NOT_COVERED"
        conflict_warnings.append(f"Benefit not covered by plan: {is_covered_clean}")
    else:
        coverage_status = "UNKNOWN"
        coverage_detail = (
            f"Plan benefit coverage terms are ambiguous or unspecified (Status: '{is_covered_clean or 'MISSING'}'). "
            "Manual review required."
        )
        policy_eligibility = "UNKNOWN"
        missing_information.append("authoritative_coverage_status")

    checklist.append({
        "requirement": "Plan Benefit Coverage",
        "status": coverage_status,
        "detail": coverage_detail
    })

    # (c) Text-Image Consistency Check
    raw_consistent = text_consistency.get("consistent", None)
    consistency_notes = text_consistency.get("notes", "")

    if raw_consistent is True:
        is_consistent = True
        consistency_status = "PASS"
        consistency_detail = f"VLM verified consistency: {consistency_notes or 'Findings corroborate imaging.'}"
    elif raw_consistent is False:
        is_consistent = False
        consistency_status = "FAIL"
        consistency_detail = f"Inconsistency detected between text report and imaging: {consistency_notes or 'Discrepancy noted.'}"
        conflict_warnings.append("Radiology text report contradicts image findings.")
    else:
        is_consistent = False
        consistency_status = "INSUFFICIENT_DATA"
        consistency_detail = "Text-image consistency assessment not available in evidence record."
        missing_information.append("text_image_consistency_assessment")

    checklist.append({
        "requirement": "Radiology Findings & Image Consistency",
        "status": consistency_status,
        "detail": consistency_detail
    })

    # (d) Clinical Indication Support Check
    raw_supported = clin_support.get("supported", None)
    support_reason = clin_support.get("reason", "")

    if raw_supported is True:
        is_supported = True
        support_status = "PASS"
        support_detail = f"Clinical necessity established: {support_reason or 'Clinical indication justifies procedure.'}"
    elif raw_supported is False:
        is_supported = False
        support_status = "FAIL"
        support_detail = f"Clinical indication does not adequately justify procedure: {support_reason or 'Indication lacking clinical justification.'}"
        conflict_warnings.append("Clinical indication does not adequately support requested procedure.")
    else:
        is_supported = False
        support_status = "INSUFFICIENT_DATA"
        support_detail = "Clinical indication support assessment not available in evidence record."
        missing_information.append("clinical_indication_support_assessment")

    checklist.append({
        "requirement": "Clinical Indication Support",
        "status": support_status,
        "detail": support_detail
    })

    # (e) Exclusions Cross-Check
    abnormalities = _normalize_string_list(image_ev.get("abnormalities", []))
    findings = _normalize_string_list(image_ev.get("findings", []))
    conflicts = check_exclusions_overlap(abnormalities, findings, exclusions_val)

    has_clinical_evidence = len(abnormalities) > 0 or len(findings) > 0

    if not has_clinical_evidence:
        missing_information.append("clinical_findings_and_abnormalities")
        conflict_warnings.append("No discrete clinical findings or abnormality tokens reported in evidence record.")

    if exclusions_val and str(exclusions_val).strip().lower() not in ("none", "nan", ""):
        if conflicts:
            checklist.append({
                "requirement": "Policy Exclusions Check",
                "status": "FLAG",
                "detail": f"Potential exclusion conflict identified: {', '.join(conflicts)} found in policy exclusion list."
            })
            policy_eligibility = "EXCLUDED"
            conflict_warnings.append(f"Clinical findings match policy exclusion terms: {', '.join(conflicts)}")
        else:
            checklist.append({
                "requirement": "Policy Exclusions Check",
                "status": "PASS",
                "detail": "No findings match policy exclusion terms."
            })
    else:
        checklist.append({
            "requirement": "Policy Exclusions Check",
            "status": "PASS",
            "detail": "No explicit exclusion terms specified in policy."
        })

    # (f) Usage Limits & Cost Sharing
    cost_summary = parse_cost_sharing(copay_val, coins_val)
    limit_note: Optional[str] = None
    if limit_qty_val is not None and limit_unit_val:
        limit_note = f"Limit: {limit_qty_val} {limit_unit_val}"

    cost_detail = cost_summary
    if limit_note:
        cost_detail += f" | {limit_note}"

    checklist.append({
        "requirement": "Cost Sharing & Limitations",
        "status": "INFO",
        "detail": cost_detail
    })

    # 4. Compute Evidence Score (0 - 100) — PRESERVED EXISTING FORMULA
    # Base weights:
    # - text_image_consistency.consistent: 40
    # - clinical_support.supported: 40
    # - is_covered == "Covered": 20
    score = 0.0
    if is_consistent:
        score += 40.0
    if is_supported:
        score += 40.0
    if is_covered:
        score += 20.0

    # If has_source_text is False, cap the evidence_score at max 40 regardless of other factors
    if not has_source_text:
        score = min(score, 40.0)

    # 5. Determine Structured Outcome Code and Recommendation (Rule Precedence)
    # Precedence Rules:
    # 1. Missing ground truth text -> Unverified AI evidence (Score capped <= 40)
    # 2. Exclusion conflict -> Explicitly excluded
    # 3. Explicit non-coverage -> Not covered
    # 4. Ambiguous / Unknown policy -> Unknown policy terms
    # 5. Image/text contradiction -> Conflicting evidence
    # 6. Missing consistency/support assessments -> Insufficient information
    # 7. Fully consistent, supported, covered, score >= 80:
    #    - If clinical findings/abnormalities present -> OUTCOME_COVERED (no review required)
    #    - If dual-empty (absent findings/abnormalities) -> OUTCOME_INSUFFICIENT_INFORMATION (review required)
    # 8. All other cases -> Manual review required

    if not has_source_text:
        outcome_code = OUTCOME_INSUFFICIENT_INFORMATION
        recommendation = "Unverified AI evidence — no original clinical report available for grounding. Requires manual review."
        requires_human_review = True
    elif conflicts:
        outcome_code = OUTCOME_EXCLUDED
        recommendation = "Potential conflict — human review required"
        requires_human_review = True
    elif policy_eligibility == "NOT_COVERED":
        outcome_code = OUTCOME_NOT_COVERED
        recommendation = "Potential conflict — human review required"
        requires_human_review = True
    elif policy_eligibility == "UNKNOWN":
        outcome_code = OUTCOME_UNKNOWN_POLICY
        recommendation = "Potential conflict — human review required"
        requires_human_review = True
    elif raw_consistent is False:
        outcome_code = OUTCOME_CONFLICTING_EVIDENCE
        recommendation = "Potential conflict — human review required"
        requires_human_review = True
    elif raw_consistent is None or raw_supported is None:
        outcome_code = OUTCOME_INSUFFICIENT_INFORMATION
        recommendation = "Additional documentation required"
        requires_human_review = True
    elif is_covered and is_consistent and is_supported and score >= 80.0:
        if has_clinical_evidence:
            outcome_code = OUTCOME_COVERED
            recommendation = "Evidence appears sufficient"
            requires_human_review = False
        else:
            # Dual-empty edge case: evidence has no findings and no abnormalities.
            # Must not silently become an unreviewed covered authorization.
            outcome_code = OUTCOME_INSUFFICIENT_INFORMATION
            recommendation = "Evidence appears sufficient"
            requires_human_review = True
    else:
        outcome_code = OUTCOME_MANUAL_REVIEW_REQUIRED
        recommendation = "Additional documentation required"
        requires_human_review = True



    logger.info(
        "Comparison result: score=%.1f, outcome=%s, recommendation='%s'",
        score,
        outcome_code,
        recommendation
    )

    return {
        "policy_requirements_checklist": checklist,
        "evidence_score": round(score, 1),
        "recommendation": recommendation,
        "outcome_code": outcome_code,
        "policy_eligibility": policy_eligibility,
        "requires_human_review": requires_human_review,
        "conflict_warnings": conflict_warnings,
        "missing_information": missing_information,
        "cost_sharing_summary": cost_summary,
        "usage_limit": limit_note,
        "exclusions_flagged": conflicts,
        "is_covered": is_covered,
        "has_source_text": has_source_text,
    }

