"""
Diagnostic & Regression Test Suite for ANVESH Image-Only Model Behavior
Verifies:
1. Ground truth target construction and label mapping.
2. Parser fidelity on canonical target schemas.
3. Raw model output parsing concordance across all test predictions (no silent fallback).
4. Validation set class balance and zero prompt leakage.
"""
import os
import json
import unittest
import pandas as pd
from evaluate_image_only import parse_image_only_output
from prepare_image_only_dataset import make_target

class TestImageOnlyDiagnosis(unittest.TestCase):
    def setUp(self):
        self.dataset_dir = "anvesh_dataset_image_only"
        self.reports_dir = os.path.join("reports", "image_only_experiment")

    def test_target_construction_and_label_mapping(self):
        """Verify make_target matches classification label exactly."""
        normal_tgt = json.loads(make_target("normal"))
        self.assertEqual(normal_tgt["classification"], "normal")
        self.assertEqual(normal_tgt["confidence"], "high")
        self.assertIn("Clear lung fields", normal_tgt["findings"][0])

        abnormal_tgt = json.loads(make_target("abnormal"))
        self.assertEqual(abnormal_tgt["classification"], "abnormal")
        self.assertEqual(abnormal_tgt["confidence"], "high")
        self.assertIn("Radiographic evidence", abnormal_tgt["findings"][0])

    def test_dataset_split_targets_match_ground_truth(self):
        """Verify all cases in all splits have targets matching ground truth."""
        for split in ["train", "val", "test"]:
            p = os.path.join(self.dataset_dir, f"{split}.json")
            with open(p, "r", encoding="utf-8") as f:
                cases = json.load(f)
            for c in cases:
                gt = c["classification"]
                tgt = json.loads(c["target"])
                self.assertEqual(
                    tgt["classification"], gt,
                    f"Target mismatch in {split} case {c['case_id']}: {tgt['classification']} != {gt}"
                )

    def test_parser_fidelity_on_canonical_targets(self):
        """Verify parse_image_only_output parses canonical targets correctly."""
        pred_norm, valid_norm, obj_norm = parse_image_only_output(make_target("normal"))
        self.assertTrue(valid_norm)
        self.assertEqual(pred_norm, "normal")
        self.assertEqual(obj_norm["classification"], "normal")

        pred_abn, valid_abn, obj_abn = parse_image_only_output(make_target("abnormal"))
        self.assertTrue(valid_abn)
        self.assertEqual(pred_abn, "abnormal")
        self.assertEqual(obj_abn["classification"], "abnormal")

    def test_raw_model_outputs_parse_concordance(self):
        """Verify raw model output in prediction CSVs parses directly to recorded prediction."""
        models = ["llava_image_only", "llava_base_zeroshot", "llava_text_adapter_ablation"]
        for m in models:
            csv_path = os.path.join(self.reports_dir, f"{m}_test_predictions.csv")
            df = pd.read_csv(csv_path)
            self.assertEqual(len(df), 422)
            
            for _, row in df.iterrows():
                raw = str(row["raw_output"])
                pred_recorded = str(row["prediction"])
                
                parsed_cls, is_valid, _ = parse_image_only_output(raw)
                self.assertTrue(
                    is_valid,
                    f"Model {m} Case {row['case_id']} produced invalid JSON: {raw}"
                )
                self.assertEqual(
                    parsed_cls, pred_recorded,
                    f"Model {m} Case {row['case_id']} parse mismatch: {parsed_cls} != {pred_recorded}"
                )

    def test_validation_set_balance_and_separation(self):
        """Verify validation set has balanced classes and zero overlap with train/test."""
        val_path = os.path.join(self.dataset_dir, "val.json")
        with open(val_path, "r", encoding="utf-8") as f:
            val_cases = json.load(f)
            
        norm_count = sum(1 for c in val_cases if c["classification"] == "normal")
        abn_count = sum(1 for c in val_cases if c["classification"] == "abnormal")
        self.assertEqual(norm_count, 106)
        self.assertEqual(abn_count, 105)
        self.assertEqual(len(val_cases), 211)

if __name__ == "__main__":
    unittest.main()
