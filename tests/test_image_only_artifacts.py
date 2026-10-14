"""
Automated Verification Suite for Image-Only ANVESH Benchmark Artifacts
Verifies physical existence, row counts, zero prompt text leakage, numerical consistency,
confusion matrix totals, and PNG image validity.
"""
import os
import json
import unittest
import pandas as pd

class TestImageOnlyArtifacts(unittest.TestCase):
    def setUp(self):
        self.reports_dir = os.path.join("reports", "image_only_experiment")
        self.dataset_dir = "anvesh_dataset_image_only"
        self.expected_artifacts = [
            "image_only_test_predictions.csv",
            "llava_image_only_test_predictions.csv",
            "llava_base_zeroshot_test_predictions.csv",
            "llava_text_adapter_ablation_test_predictions.csv",
            "llava_image_only_metrics.csv",
            "llava_base_zeroshot_metrics.csv",
            "llava_text_adapter_ablation_metrics.csv",
            "image_only_side_by_side.csv",
            "image_only_confusion_matrix_counts.csv",
            "image_only_benchmark_summary.json",
            "ieee_image_only_tables.tex",
            "ieee_image_only_tables.md",
            "confusion_matrix_llava_image_only.png",
            "confusion_matrix_llava_base_zeroshot.png",
            "confusion_matrix_llava_text_adapter_ablation.png",
            "confusion_matrices_side_by_side.png"
        ]

    def test_all_expected_artifacts_exist_and_nonempty(self):
        for fname in self.expected_artifacts:
            p = os.path.join(self.reports_dir, fname)
            self.assertTrue(os.path.exists(p), f"Missing artifact: {p}")
            self.assertGreater(os.path.getsize(p), 0, f"Artifact is empty: {p}")

    def test_zero_prompt_text_leakage_in_dataset(self):
        for split in ["train.json", "val.json", "test.json"]:
            split_p = os.path.join(self.dataset_dir, split)
            self.assertTrue(os.path.exists(split_p), f"Missing split file: {split_p}")
            with open(split_p, "r", encoding="utf-8") as f:
                cases = json.load(f)
            
            leakage_keywords = [
                "FINDINGS:", "IMPRESSION:", "CLINICAL:", "HISTORY:",
                "findings are", "impression is", "cardiomegaly", "pneumothorax",
                "infiltrate", "effusion", "consolidation", "atelectasis",
                "edema", "nodule", "fracture", "calcinosis"
            ]
            
            for item in cases:
                prompt_text = item.get("prompt", "")
                
                # Verify prompt does not leak findings or diagnostic conclusions
                for kw in leakage_keywords:
                    self.assertNotIn(
                        kw.lower(), prompt_text.lower(),
                        f"Prompt text leakage detected in {split} case {item.get('case_id')}: contains '{kw}'"
                    )
                self.assertIn("chest radiograph", prompt_text.lower())

    def test_dataset_split_counts_and_zero_overlap(self):
        splits = {}
        for s in ["train", "val", "test"]:
            p = os.path.join(self.dataset_dir, f"{s}.json")
            with open(p, "r", encoding="utf-8") as f:
                splits[s] = json.load(f)
                
        self.assertEqual(len(splits["train"]), 1474, "Train split must contain 1474 cases")
        self.assertEqual(len(splits["val"]), 211, "Val split must contain 211 cases")
        self.assertEqual(len(splits["test"]), 422, "Test split must contain 422 cases")
        
        train_ids = set(c["case_id"] for c in splits["train"])
        val_ids = set(c["case_id"] for c in splits["val"])
        test_ids = set(c["case_id"] for c in splits["test"])
        
        self.assertEqual(len(train_ids.intersection(val_ids)), 0, "Train-Val ID overlap detected")
        self.assertEqual(len(train_ids.intersection(test_ids)), 0, "Train-Test ID overlap detected")
        self.assertEqual(len(val_ids.intersection(test_ids)), 0, "Val-Test ID overlap detected")

    def test_test_prediction_counts_and_balance(self):
        # Master combined predictions
        master_p = os.path.join(self.reports_dir, "image_only_test_predictions.csv")
        df_master = pd.read_csv(master_p)
        self.assertEqual(len(df_master), 1266, "Master predictions must contain 1266 rows (3 models * 422 cases)")
        self.assertEqual(set(df_master["condition"].unique()), {"llava_image_only", "llava_base_zeroshot", "llava_text_adapter_ablation"})

        # Individual model predictions
        models = ["llava_image_only", "llava_base_zeroshot", "llava_text_adapter_ablation"]
        for m in models:
            p = os.path.join(self.reports_dir, f"{m}_test_predictions.csv")
            df = pd.read_csv(p)
            self.assertEqual(len(df), 422, f"Model {m} predictions must have 422 rows")
            self.assertEqual(df["case_id"].nunique(), 422, f"Model {m} must have 422 unique case IDs")
            self.assertEqual(df["prediction"].isna().sum(), 0, f"Model {m} has null predictions")
            gt_counts = df["ground_truth"].value_counts().to_dict()
            self.assertEqual(gt_counts.get("normal"), 211, f"Model {m} normal ground truth != 211")
            self.assertEqual(gt_counts.get("abnormal"), 211, f"Model {m} abnormal ground truth != 211")

    def test_confusion_matrix_counts(self):
        cm_p = os.path.join(self.reports_dir, "image_only_confusion_matrix_counts.csv")
        df_cm = pd.read_csv(cm_p)
        self.assertEqual(len(df_cm), 3)

        expected = {
            "llava_image_only": {"TP": 211, "TN": 0, "FP": 211, "FN": 0, "Total": 422},
            "llava_base_zeroshot": {"TP": 0, "TN": 211, "FP": 0, "FN": 211, "Total": 422},
            "llava_text_adapter_ablation": {"TP": 0, "TN": 211, "FP": 0, "FN": 211, "Total": 422}
        }

        for _, row in df_cm.iterrows():
            cond = row["Condition"]
            self.assertIn(cond, expected)
            exp = expected[cond]
            self.assertEqual(int(row["TP"]), exp["TP"])
            self.assertEqual(int(row["TN"]), exp["TN"])
            self.assertEqual(int(row["FP"]), exp["FP"])
            self.assertEqual(int(row["FN"]), exp["FN"])
            self.assertEqual(int(row["Total"]), exp["Total"])

    def test_benchmark_summary_json_integrity(self):
        summary_p = os.path.join(self.reports_dir, "image_only_benchmark_summary.json")
        with open(summary_p, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("benchmark_metadata", data)
        self.assertIn("results", data)
        self.assertEqual(data["benchmark_metadata"]["prompt_text_leakage"], "NONE (Zero findings, impressions, or clinical text in prompts)")
        
        results = data["results"]
        self.assertIn("llava_image_only", results)
        self.assertIn("llava_base_zeroshot", results)
        self.assertIn("llava_text_adapter_ablation", results)

        # Verify mathematical invariants
        for m, res in results.items():
            self.assertEqual(res["Total Cases (N)"], 422)
            self.assertEqual(res["Ground Truth Positives (Abnormal)"], 211)
            self.assertEqual(res["Ground Truth Negatives (Normal)"], 211)
            self.assertEqual(res["True Positives (TP)"] + res["False Negatives (FN)"], 211)
            self.assertEqual(res["True Negatives (TN)"] + res["False Positives (FP)"], 211)
            self.assertAlmostEqual(res["Accuracy"], 0.50, places=4)
            self.assertAlmostEqual(res["Balanced Accuracy"], 0.50, places=4)
            self.assertAlmostEqual(res["Matthews Correlation Coefficient (MCC)"], 0.0, places=4)
            self.assertAlmostEqual(res["Cohen's Kappa"], 0.0, places=4)

    def test_png_files_valid_format(self):
        png_files = [
            "confusion_matrix_llava_image_only.png",
            "confusion_matrix_llava_base_zeroshot.png",
            "confusion_matrix_llava_text_adapter_ablation.png",
            "confusion_matrices_side_by_side.png"
        ]
        png_header = b"\x89PNG\r\n\x1a\n"
        for fname in png_files:
            p = os.path.join(self.reports_dir, fname)
            with open(p, "rb") as f:
                header = f.read(8)
            self.assertEqual(header, png_header, f"File {fname} is not a valid PNG")

if __name__ == "__main__":
    unittest.main()
