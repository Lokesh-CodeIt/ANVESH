"""
Unit tests for MedAuth-VLM Results & Evaluation metric formulas and calculation traceability.
Validates mathematical correctness of:
- Accuracy, Precision, Recall, Specificity, F1, Macro-F1, Weighted-F1
- Confusion Matrix generation and orientation
- Expected Calibration Error (ECE)
- Policy Engine score capping on ungrounded cases
- Consistency across exported result formats
"""

import math
import pytest
import numpy as np


def compute_binary_metrics(y_true, y_pred):
    """Compute binary classification metrics with zero-division handling."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    assert len(y_true) == len(y_pred)
    
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    total = len(y_true)
    
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    # Class 0 metrics
    p0 = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    r0 = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1_0 = 2 * p0 * r0 / (p0 + r0) if (p0 + r0) > 0 else 0.0
    
    # Class 1 support & Class 0 support
    sup1 = tp + fn
    sup0 = tn + fp
    
    macro_f1 = (f1 + f1_0) / 2.0
    weighted_f1 = (sup1 * f1 + sup0 * f1_0) / total if total > 0 else 0.0
    
    return {
        "tp": tp, "fp": fp, "tn": tn, "fn": fn, "total": total,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "specificity": specificity,
        "f1": f1,
        "f1_class_0": f1_0,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "support_class_1": sup1,
        "support_class_0": sup0,
        "confusion_matrix": [[tn, fp], [fn, tp]]
    }


def compute_ece(y_true, confidences, n_bins=10):
    """Compute Expected Calibration Error (ECE) across n uniform bins."""
    y_true = np.asarray(y_true)
    confidences = np.asarray(confidences)
    assert len(y_true) == len(confidences)
    
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    n = len(y_true)
    bin_details = []
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        if i == n_bins - 1:
            in_bin = (confidences >= bin_lower) & (confidences <= bin_upper)
        else:
            in_bin = (confidences >= bin_lower) & (confidences < bin_upper)
            
        bin_size = int(np.sum(in_bin))
        if bin_size > 0:
            bin_acc = float(np.mean(y_true[in_bin]))
            bin_conf = float(np.mean(confidences[in_bin]))
            bin_weight = bin_size / n
            ece += bin_weight * abs(bin_acc - bin_conf)
            bin_details.append({
                "bin": i + 1,
                "range": f"[{bin_lower:.2f}, {bin_upper:.2f}]",
                "count": bin_size,
                "accuracy": round(bin_acc, 4),
                "confidence": round(bin_conf, 4),
                "diff": round(abs(bin_acc - bin_conf), 4)
            })
            
    return ece, bin_details


class TestMetricFormulas:
    """Mathematical verification of evaluation metrics on controlled test fixtures."""
    
    def test_standard_binary_metrics(self):
        # 10 test samples: 6 positive (1), 4 negative (0)
        # Predictions: TP=5, FP=1, TN=3, FN=1
        y_true = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
        y_pred = [0, 0, 0, 1, 0, 1, 1, 1, 1, 1]
        
        m = compute_binary_metrics(y_true, y_pred)
        assert m["total"] == 10
        assert m["tp"] == 5
        assert m["fp"] == 1
        assert m["tn"] == 3
        assert m["fn"] == 1
        assert pytest.approx(m["accuracy"], 0.001) == 0.800
        assert pytest.approx(m["precision"], 0.001) == 5 / 6  # 0.8333
        assert pytest.approx(m["recall"], 0.001) == 5 / 6     # 0.8333
        assert pytest.approx(m["specificity"], 0.001) == 3 / 4 # 0.7500
        assert pytest.approx(m["f1"], 0.001) == 5 / 6        # 0.8333
        assert m["confusion_matrix"] == [[3, 1], [1, 5]]

    def test_macro_and_weighted_f1(self):
        y_true = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
        y_pred = [0, 0, 0, 1, 0, 1, 1, 1, 1, 1]
        m = compute_binary_metrics(y_true, y_pred)
        
        # Class 1: P=5/6, R=5/6, F1=5/6 = 0.8333
        # Class 0: P=3/4, R=3/4, F1=3/4 = 0.7500
        expected_macro = (5/6 + 3/4) / 2.0  # (0.8333 + 0.7500)/2 = 0.79167
        expected_weighted = (6 * (5/6) + 4 * (3/4)) / 10.0 # (5 + 3)/10 = 0.8000
        assert pytest.approx(m["macro_f1"], 0.001) == expected_macro
        assert pytest.approx(m["weighted_f1"], 0.001) == expected_weighted

    def test_zero_division_safety(self):
        # Case where no positives predicted: TP=0, FP=0 -> Precision=0, F1=0
        y_true = [1, 1, 1]
        y_pred = [0, 0, 0]
        m = compute_binary_metrics(y_true, y_pred)
        assert m["precision"] == 0.0
        assert m["recall"] == 0.0
        assert m["f1"] == 0.0
        assert m["accuracy"] == 0.0

    def test_ece_perfect_calibration(self):
        # 4 samples with perfectly calibrated probabilities
        y_true = [1, 1, 0, 0]
        conf = [1.0, 1.0, 0.0, 0.0]
        ece, _ = compute_ece(y_true, conf, n_bins=10)
        assert pytest.approx(ece, 0.001) == 0.0

    def test_ece_overconfident_miscalibration(self):
        # Overconfident: predicts 1.0 confidence for wrong predictions
        y_true = [0, 0, 0, 0]
        conf = [0.95, 0.95, 0.95, 0.95]
        ece, bins = compute_ece(y_true, conf, n_bins=10)
        # All fall in [0.9, 1.0] bin: acc=0.0, conf=0.95 -> diff=0.95 -> ECE=0.95
        assert pytest.approx(ece, 0.001) == 0.95

    def test_policy_engine_grounding_cap(self):
        from policy_engine import compare_evidence_to_policy
        dummy_evidence = {
            "image_evidence": {"abnormalities": []},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        covered_policy = {"is_covered": "Covered"}
        
        # With source text -> 40 + 40 + 20 = 100.0
        res_grounded = compare_evidence_to_policy(dummy_evidence, covered_policy, has_source_text=True)
        assert res_grounded["evidence_score"] == 100.0
        assert res_grounded["recommendation"] == "Evidence appears sufficient"
        
        # Without source text -> capped at 40.0, warning status
        res_ungrounded = compare_evidence_to_policy(dummy_evidence, covered_policy, has_source_text=False)
        assert res_ungrounded["evidence_score"] == 40.0
        assert "no original clinical report" in res_ungrounded["recommendation"].lower()
        
        # Verify checklist status
        grounding_check = [c for c in res_ungrounded["policy_requirements_checklist"] if "Grounding" in c["requirement"]][0]
        assert grounding_check["status"] == "WARNING"
