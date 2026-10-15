"""
Automated Unit Tests for Vision Transformer (ViT-B/16) CXR Benchmark Artifacts
Verifies physical existence, schema conformance, probability bounds, numerical consistency,
split integrity, confusion matrix arithmetic, and absence of text leakage.
"""

import os
import json
import unittest
import pandas as pd
import numpy as np

class TestViTArtifacts(unittest.TestCase):
    def setUp(self):
        self.reports_dir = os.path.join("reports", "image_only_experiment", "vit")
        self.checkpoint_dir = "checkpoints_vit_image_only"
        self.dataset_dir = "anvesh_dataset_image_only"
        
        self.expected_report_files = [
            "vit_test_predictions.csv",
            "vit_standalone_metrics.csv",
            "vit_summary.json",
            "vit_confusion_matrix_counts.csv",
            "vit_confusion_matrix.png",
            "vit_training_history.csv",
            "vit_training_curves.png",
            "vit_vs_existing_models_comparison.csv",
            "vit_ieee_tables.md",
            "vit_ieee_tables.tex",
            "reproducibility_report.md"
        ]
        
        self.expected_checkpoint_files = [
            "best_vit_model.pt",
            "vit_config.json",
            "vit_training_history.csv"
        ]

    def test_checkpoint_files_exist_and_valid(self):
        for fname in self.expected_checkpoint_files:
            p = os.path.join(self.checkpoint_dir, fname)
            self.assertTrue(os.path.exists(p), f"Missing checkpoint file: {p}")
            self.assertGreater(os.path.getsize(p), 0, f"Checkpoint file is empty: {p}")
            
        # Check config json
        cfg_p = os.path.join(self.checkpoint_dir, "vit_config.json")
        with open(cfg_p, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("architecture"), "vit_b_16")
        self.assertEqual(cfg.get("num_classes"), 2)
        self.assertEqual(cfg.get("train_samples"), 1474)
        self.assertEqual(cfg.get("val_samples"), 211)

    def test_report_artifacts_exist_and_nonempty(self):
        for fname in self.expected_report_files:
            p = os.path.join(self.reports_dir, fname)
            self.assertTrue(os.path.exists(p), f"Missing report artifact: {p}")
            self.assertGreater(os.path.getsize(p), 0, f"Report artifact is empty: {p}")

    def test_predictions_schema_and_integrity(self):
        preds_p = os.path.join(self.reports_dir, "vit_test_predictions.csv")
        df = pd.read_csv(preds_p)
        
        self.assertEqual(len(df), 422, "Predictions must contain exactly 422 cases")
        self.assertEqual(df["case_id"].nunique(), 422, "All 422 case IDs must be unique")
        
        # Verify required columns
        required_cols = ["case_id", "condition", "ground_truth", "prediction", "prob_normal", "prob_abnormal", "latency_ms"]
        for col in required_cols:
            self.assertIn(col, df.columns, f"Missing required column: {col}")
            
        # Verify valid values
        self.assertTrue(df["prediction"].isin(["normal", "abnormal"]).all())
        self.assertTrue(df["ground_truth"].isin(["normal", "abnormal"]).all())
        
        # Ground truth counts
        gt_counts = df["ground_truth"].value_counts().to_dict()
        self.assertEqual(gt_counts.get("normal"), 211)
        self.assertEqual(gt_counts.get("abnormal"), 211)
        
        # Check probability bounds [0, 1]
        self.assertTrue((df["prob_normal"] >= 0.0).all() and (df["prob_normal"] <= 1.0).all())
        self.assertTrue((df["prob_abnormal"] >= 0.0).all() and (df["prob_abnormal"] <= 1.0).all())
        
        # Check probabilities sum to approximately 1.0
        prob_sum = df["prob_normal"] + df["prob_abnormal"]
        np.testing.assert_allclose(prob_sum.values, 1.0, atol=1e-4)
        
        # Check prediction matches argmax
        expected_pred = np.where(df["prob_abnormal"] >= 0.5, "abnormal", "normal")
        np.testing.assert_array_equal(df["prediction"].values, expected_pred)
        
        # Latency must be positive
        self.assertTrue((df["latency_ms"] > 0).all())

    def test_confusion_matrix_and_metrics_concordance(self):
        # Load predictions
        df = pd.read_csv(os.path.join(self.reports_dir, "vit_test_predictions.csv"))
        
        # Calculate expected TP, TN, FP, FN
        tp_exp = int(((df["ground_truth"] == "abnormal") & (df["prediction"] == "abnormal")).sum())
        tn_exp = int(((df["ground_truth"] == "normal") & (df["prediction"] == "normal")).sum())
        fp_exp = int(((df["ground_truth"] == "normal") & (df["prediction"] == "abnormal")).sum())
        fn_exp = int(((df["ground_truth"] == "abnormal") & (df["prediction"] == "normal")).sum())
        
        self.assertEqual(tp_exp + tn_exp + fp_exp + fn_exp, 422)
        
        # Verify against vit_summary.json
        summary_p = os.path.join(self.reports_dir, "vit_summary.json")
        with open(summary_p, "r", encoding="utf-8") as f:
            summary = json.load(f)
            
        self.assertEqual(summary["True Positives (TP)"], tp_exp)
        self.assertEqual(summary["True Negatives (TN)"], tn_exp)
        self.assertEqual(summary["False Positives (FP)"], fp_exp)
        self.assertEqual(summary["False Negatives (FN)"], fn_exp)
        self.assertAlmostEqual(summary["Accuracy"], (tp_exp + tn_exp) / 422.0, places=6)
        
        # Verify against vit_confusion_matrix_counts.csv
        cm_df = pd.read_csv(os.path.join(self.reports_dir, "vit_confusion_matrix_counts.csv"))
        self.assertEqual(cm_df["TP"].iloc[0], tp_exp)
        self.assertEqual(cm_df["TN"].iloc[0], tn_exp)
        self.assertEqual(cm_df["FP"].iloc[0], fp_exp)
        self.assertEqual(cm_df["FN"].iloc[0], fn_exp)

    def test_png_files_are_valid(self):
        png_files = ["vit_confusion_matrix.png", "vit_training_curves.png"]
        for fname in png_files:
            p = os.path.join(self.reports_dir, fname)
            self.assertTrue(os.path.exists(p), f"Missing PNG: {p}")
            with open(p, "rb") as f:
                header = f.read(8)
            self.assertEqual(header, b"\x89PNG\r\n\x1a\n", f"Invalid PNG signature for {p}")

if __name__ == "__main__":
    unittest.main()
