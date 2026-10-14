"""
Automated Verification of Final ANVESH Benchmark Artifacts
Verifies physical existence, row counts, numerical consistency, and confusion matrix totals.
"""
import os
import json
import unittest
import pandas as pd

class TestFinalArtifacts(unittest.TestCase):
    def setUp(self):
        self.reports_dir = "reports"
        self.expected_files = [
            "llava_standalone_metrics.csv",
            "medgemma_standalone_metrics.csv",
            "llava_vs_medgemma_side_by_side.csv",
            "confusion_matrix_counts.csv",
            "benchmark_summary.json",
            "ieee_tables.tex",
            "ieee_tables.md",
            "confusion_matrix_llava.png",
            "confusion_matrix_medgemma.png",
            "confusion_matrices_side_by_side.png",
            "llava_vs_medgemma_test_predictions.csv",
            "llava_vs_medgemma_metrics_comparison.csv",
            "eval_progress_checkpoint.json"
        ]

    def test_all_expected_artifacts_exist(self):
        for fname in self.expected_files:
            p = os.path.join(self.reports_dir, fname)
            self.assertTrue(os.path.exists(p), f"Missing artifact: {p}")
            self.assertGreater(os.path.getsize(p), 0, f"Artifact is empty: {p}")

    def test_test_prediction_counts(self):
        pred_p = os.path.join(self.reports_dir, "llava_vs_medgemma_test_predictions.csv")
        df = pd.read_csv(pred_p)
        self.assertEqual(len(df), 422, "Predictions CSV row count must be exactly 422")
        self.assertEqual(df["case_id"].nunique(), 422, "Must have 422 unique case IDs")
        self.assertEqual(df["llava_pred"].isna().sum(), 0, "No null predictions allowed for LLaVA")
        self.assertEqual(df["medgemma_pred"].isna().sum(), 0, "No null predictions allowed for MedGemma")
        
        gt_counts = df["ground_truth"].value_counts().to_dict()
        self.assertEqual(gt_counts.get("normal"), 211)
        self.assertEqual(gt_counts.get("abnormal"), 211)

    def test_confusion_matrix_concordance(self):
        cm_p = os.path.join(self.reports_dir, "confusion_matrix_counts.csv")
        df_cm = pd.read_csv(cm_p)
        self.assertEqual(len(df_cm), 2)
        
        # Check MedGemma
        mg_row = df_cm[df_cm["Condition"].str.contains("MedGemma")].iloc[0]
        self.assertEqual(int(mg_row["TP"]), 67)
        self.assertEqual(int(mg_row["TN"]), 207)
        self.assertEqual(int(mg_row["FP"]), 4)
        self.assertEqual(int(mg_row["FN"]), 144)
        self.assertEqual(int(mg_row["Total"]), 422)

        # Check LLaVA
        ll_row = df_cm[df_cm["Condition"].str.contains("LLaVA")].iloc[0]
        self.assertEqual(int(ll_row["TP"]), 177)
        self.assertEqual(int(ll_row["TN"]), 198)
        self.assertEqual(int(ll_row["FP"]), 13)
        self.assertEqual(int(ll_row["FN"]), 34)
        self.assertEqual(int(ll_row["Total"]), 422)

    def test_benchmark_summary_json(self):
        summary_p = os.path.join(self.reports_dir, "benchmark_summary.json")
        with open(summary_p, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        self.assertIn("benchmark_metadata", data)
        self.assertIn("medgemma_4b_pretrained", data)
        self.assertIn("llava_1_5_7b_finetuned", data)
        
        ll = data["llava_1_5_7b_finetuned"]
        self.assertAlmostEqual(ll["Accuracy"], 375 / 422, places=4)
        self.assertAlmostEqual(ll["Sensitivity / Recall (Abnormal)"], 177 / 211, places=4)
        self.assertAlmostEqual(ll["Specificity (Normal)"], 198 / 211, places=4)

if __name__ == "__main__":
    unittest.main()
