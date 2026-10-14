"""
Unit and Integration Tests for ANVESH Multimodal Benchmark Integrity
Verifies:
1. Label mapping and binary conversion consistency.
2. Independent medical classification metric formulas (Acc, BalAcc, Sens, Spec, Prec, F1, MCC, Kappa).
3. Zero-division guards and edge-case resilience.
4. Dataset split partitioning and zero patient/case leakage.
5. Physical presence of all test cohort images on disk.
6. Robustness of model output JSON cleaning and regex fallbacks.
"""

import os
import json
import math
from evaluate_llava_vs_medgemma import clean_json_text, compute_comprehensive_metrics, wilson_score_interval

class TestMetricFormulas:
    def test_perfect_classification(self):
        y_true = ["abnormal"] * 10 + ["normal"] * 10
        y_pred = ["abnormal"] * 10 + ["normal"] * 10
        m = compute_comprehensive_metrics(y_true, y_pred)
        
        assert m["total"] == 20
        assert m["tp"] == 10
        assert m["tn"] == 10
        assert m["fp"] == 0
        assert m["fn"] == 0
        assert m["accuracy"] == 1.0
        assert m["balanced_accuracy"] == 1.0
        assert m["sensitivity"] == 1.0
        assert m["specificity"] == 1.0
        assert m["precision"] == 1.0
        assert m["f1_abnormal"] == 1.0
        assert m["macro_f1"] == 1.0
        assert m["mcc"] == 1.0
        assert m["cohens_kappa"] == 1.0

    def test_imperfect_classification_known_values(self):
        # 10 abnormal (6 TP, 4 FN), 10 normal (8 TN, 2 FP)
        y_true = ["abnormal"] * 6 + ["abnormal"] * 4 + ["normal"] * 8 + ["normal"] * 2
        y_pred = ["abnormal"] * 6 + ["normal"] * 4   + ["normal"] * 8 + ["abnormal"] * 2
        m = compute_comprehensive_metrics(y_true, y_pred)
        
        assert m["tp"] == 6
        assert m["fn"] == 4
        assert m["tn"] == 8
        assert m["fp"] == 2
        assert m["accuracy"] == 14 / 20  # 0.70
        assert m["sensitivity"] == 6 / 10  # 0.60
        assert m["specificity"] == 8 / 10  # 0.80
        assert m["balanced_accuracy"] == 0.70
        assert m["precision"] == 6 / 8  # 0.75
        expected_f1_abn = (2 * 0.75 * 0.60) / (0.75 + 0.60)
        assert abs(m["f1_abnormal"] - expected_f1_abn) < 1e-6

    def test_zero_division_guard(self):
        # All predicted normal (TP=0, FP=0)
        y_true = ["abnormal"] * 5 + ["normal"] * 5
        y_pred = ["normal"] * 10
        m = compute_comprehensive_metrics(y_true, y_pred)
        
        assert m["tp"] == 0
        assert m["fp"] == 0
        assert m["precision"] == 0.0
        assert m["f1_abnormal"] == 0.0
        assert not math.isnan(m["mcc"])
        assert not math.isnan(m["cohens_kappa"])

    def test_wilson_confidence_interval_bounds(self):
        low, high = wilson_score_interval(10, 20)
        assert 0.0 <= low <= 0.5 <= high <= 1.0
        # Edge cases
        assert wilson_score_interval(0, 0) == (0.0, 0.0)
        low_0, high_0 = wilson_score_interval(0, 10)
        assert low_0 == 0.0
        assert high_0 > 0.0
        low_10, high_10 = wilson_score_interval(10, 10)
        assert low_10 < 1.0
        assert high_10 == 1.0

class TestDataSplitIntegrity:
    def test_split_files_exist(self):
        assert os.path.exists("anvesh_dataset/train.json")
        assert os.path.exists("anvesh_dataset/val.json")
        assert os.path.exists("anvesh_dataset/test.json")

    def test_zero_case_leakage(self):
        with open("anvesh_dataset/train.json", "r", encoding="utf-8") as f:
            train_data = json.load(f)
        with open("anvesh_dataset/val.json", "r", encoding="utf-8") as f:
            val_data = json.load(f)
        with open("anvesh_dataset/test.json", "r", encoding="utf-8") as f:
            test_data = json.load(f)

        train_cases = {d["case_id"] for d in train_data}
        val_cases = {d["case_id"] for d in val_data}
        test_cases = {d["case_id"] for d in test_data}

        assert len(train_cases & val_cases) == 0, "Leakage detected between train and val!"
        assert len(train_cases & test_cases) == 0, "Leakage detected between train and test!"
        assert len(val_cases & test_cases) == 0, "Leakage detected between val and test!"

    def test_dataset_denominators(self):
        with open("anvesh_dataset/train.json", "r", encoding="utf-8") as f:
            train_len = len(json.load(f))
        with open("anvesh_dataset/val.json", "r", encoding="utf-8") as f:
            val_len = len(json.load(f))
        with open("anvesh_dataset/test.json", "r", encoding="utf-8") as f:
            test_len = len(json.load(f))

        assert train_len == 1474
        assert val_len == 211
        assert test_len == 422
        assert train_len + val_len + test_len == 2107

    def test_test_images_exist(self):
        with open("anvesh_dataset/test.json", "r", encoding="utf-8") as f:
            test_data = json.load(f)
        for c in test_data:
            p = os.path.join("anvesh_dataset", c["image_path"])
            assert os.path.exists(p), f"Missing image file: {p}"

class TestJSONParsingRobustness:
    def test_standard_json(self):
        text = '{"image_evidence": {"abnormalities": ["Pneumothorax"], "findings": []}}'
        data, valid = clean_json_text(text)
        assert valid is True
        assert data["image_evidence"]["abnormalities"] == ["Pneumothorax"]

    def test_markdown_fence_json(self):
        text = '```json\n{"image_evidence": {"abnormalities": ["Atelectasis"], "findings": []}}\n```'
        data, valid = clean_json_text(text)
        assert valid is True
        assert data["image_evidence"]["abnormalities"] == ["Atelectasis"]

    def test_fallback_unclosed_json(self):
        text = 'Here is the result: {"image_evidence": {"abnormalities": ["Cardiomegaly", "Effusion"]'
        data, valid = clean_json_text(text)
        assert valid is False
        assert "Cardiomegaly" in data["image_evidence"]["abnormalities"]
        assert "Effusion" in data["image_evidence"]["abnormalities"]
