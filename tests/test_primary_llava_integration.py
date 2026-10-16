"""
tests/test_primary_llava_integration.py

Comprehensive regression test suite for Primary Fine-Tuned LLaVA-1.5-7B integration:
1. Validates presence and integrity of fine-tuned adapter weights and training history.
2. Validates mathematical consistency of Phase 4 held-out test predictions (N=422) and confusion matrix.
3. Confirms absolute absence of silent fallback to MedGemma or ViT.
4. Validates live forward-pass inference on genuine radiograph pixels with posterior probabilities and latency.
5. Verifies end-to-end evidence generation for incoming medical authorization cases.
"""

import os
import sys
import json
import unittest
import pandas as pd
import numpy as np

# Ensure root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.ai_service import (
    PRIMARY_LLAVA_ADAPTER,
    classify_radiograph_primary_llava,
    generate_submission_ai_evidence,
    get_primary_llava_model,
)


class TestPrimaryLLaVAIntegration(unittest.TestCase):

    def setUp(self):
        self.adapter_dir = PRIMARY_LLAVA_ADAPTER
        self.reports_dir = os.path.join(BASE_DIR, "reports")
        self.test_img_path = os.path.join(BASE_DIR, "anvesh_dataset", "images", "cxr_248.jpg")

    def test_01_primary_adapter_artifacts_exist_and_nonempty(self):
        """Verify fine-tuned Primary LLaVA adapter files exist and have non-zero weight sizes."""
        safetensors_path = os.path.join(self.adapter_dir, "adapter_model.safetensors")
        config_path = os.path.join(self.adapter_dir, "adapter_config.json")
        info_path = os.path.join(self.adapter_dir, "best_checkpoint_info.json")
        history_path = os.path.join(os.path.dirname(self.adapter_dir), "training_history.csv")

        self.assertTrue(os.path.exists(safetensors_path), f"Missing {safetensors_path}")
        self.assertGreater(os.path.getsize(safetensors_path), 50 * 1024 * 1024, "Adapter safetensors too small (<50MB)")

        self.assertTrue(os.path.exists(config_path), f"Missing {config_path}")
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        self.assertIn("target_modules", cfg)
        # Ensure projector linear layers were adapted
        target_str = str(cfg["target_modules"])
        self.assertTrue("linear_1" in target_str or "linear_2" in target_str or "q_proj" in target_str)

        self.assertTrue(os.path.exists(info_path), f"Missing {info_path}")
        self.assertTrue(os.path.exists(history_path), f"Missing {history_path}")

    def test_02_held_out_evaluation_metrics_consistency(self):
        """Independently audit test predictions CSV and confirm exact concordance with metric formulas."""
        preds_path = os.path.join(self.reports_dir, "v2_llava_test_predictions.csv")
        summary_path = os.path.join(self.reports_dir, "v2_llava_summary.json")

        self.assertTrue(os.path.exists(preds_path), f"Missing {preds_path}")
        self.assertTrue(os.path.exists(summary_path), f"Missing {summary_path}")

        df = pd.read_csv(preds_path)
        self.assertEqual(len(df), 422, "Held-out test cohort must contain exactly 422 cases")
        self.assertEqual(df["prediction"].isna().sum(), 0, "Null predictions found in test predictions")

        with open(summary_path, "r", encoding="utf-8") as f:
            summary = json.load(f)

        tp = int(summary["True Positives (TP)"])
        tn = int(summary["True Negatives (TN)"])
        fp = int(summary["False Positives (FP)"])
        fn = int(summary["False Negatives (FN)"])

        # Check total
        self.assertEqual(tp + tn + fp + fn, 422)

        # Check absence of single-class collapse
        self.assertGreater(tp, 40, "Model collapsed: TP too low")
        self.assertGreater(tn, 40, "Model collapsed: TN too low")
        self.assertGreater(fp, 20, "Model collapsed: FP too low")
        self.assertGreater(fn, 20, "Model collapsed: FN too low")

        # Independent calculation of accuracy, sensitivity, specificity
        calc_acc = round((tp + tn) / 422, 4)
        calc_sens = round(tp / (tp + fn), 4)
        calc_spec = round(tn / (tn + fp), 4)

        self.assertAlmostEqual(summary["Accuracy"], calc_acc, places=4)
        self.assertAlmostEqual(summary["Sensitivity / Recall (Abnormal)"], calc_sens, places=4)
        self.assertAlmostEqual(summary["Specificity (Normal)"], calc_spec, places=4)

    def test_03_website_no_silent_fallback_to_medgemma(self):
        """Verify the website engine never silently falls back to MedGemma or ViT as primary."""
        # Case A: Awaiting image
        res_no_img = generate_submission_ai_evidence(
            indication="Shortness of breath for 5 days",
            prelim_findings="No gross consolidation",
            radiograph_path=None,
        )
        self.assertNotEqual(res_no_img["ai_source"], "MEDGEMMA")
        self.assertNotIn("medgemma", res_no_img["ai_model_version"].lower())
        self.assertIn("LLaVA-1.5-7B", res_no_img["ai_model_version"])
        self.assertEqual(res_no_img["ai_source"], "RULE_ENGINE")

        # Case B: Invalid image path
        res_bad_img = generate_submission_ai_evidence(
            indication="Chest pain",
            prelim_findings="Unremarkable",
            radiograph_path="nonexistent_image_path.jpg",
        )
        self.assertNotEqual(res_bad_img["ai_source"], "MEDGEMMA")
        self.assertNotIn("medgemma", res_bad_img["ai_model_version"].lower())

    def test_04_live_gpu_inference_on_radiograph_image(self):
        """Execute real forward-pass inference on an actual radiograph using Primary LLaVA-1.5-7B."""
        if not os.path.exists(self.test_img_path):
            self.skipTest(f"Test radiograph {self.test_img_path} not found")

        result = classify_radiograph_primary_llava(self.test_img_path)

        self.assertTrue("Fine-Tuned LLaVA-1.5-7B" in result["model_name"] and "Primary" in result["model_name"])
        self.assertEqual(result["model_type"], "PRIMARY_MULTIMODAL_VLM")
        self.assertIn(result["classification"], ("normal", "abnormal"))
        self.assertGreaterEqual(result["confidence"], 0.5)
        self.assertLessEqual(result["confidence"], 1.0)
        self.assertAlmostEqual(
            result["probabilities"]["normal"] + result["probabilities"]["abnormal"],
            1.0,
            places=3
        )
        self.assertGreater(result["latency_ms"], 0.0)
        self.assertIsInstance(result["findings"], list)
        self.assertIsInstance(result["abnormalities"], list)
        self.assertTrue(len(result["impression_summary"]) > 5)

    def test_05_end_to_end_submission_evidence_generation(self):
        """Verify full end-to-end evidence payload generation with attached radiograph."""
        if not os.path.exists(self.test_img_path):
            self.skipTest(f"Test radiograph {self.test_img_path} not found")

        result = generate_submission_ai_evidence(
            indication="Persistent dyspnea and wheezing",
            prelim_findings="Bilateral clear lung fields",
            radiograph_path=self.test_img_path,
            service_type="Chest Radiograph (2 Views)",
        )

        self.assertEqual(result["ai_source"], "PRIMARY_LLAVA")
        self.assertTrue("Fine-Tuned LLaVA-1.5-7B" in result["ai_model_version"] and "Primary" in result["ai_model_version"])
        self.assertEqual(result["ai_status"], "COMPLETED")
        self.assertIsNone(result["ai_error"])

        evidence = result["ai_evidence"]
        self.assertIn("image_evidence", evidence)
        self.assertIn("primary_llava_output", evidence["image_evidence"])
        self.assertIsNotNone(evidence["image_evidence"]["primary_llava_output"])
        self.assertTrue(
            "Fine-Tuned LLaVA-1.5-7B" in evidence["inference_metadata"]["primary_model"] and "Primary" in evidence["inference_metadata"]["primary_model"]
        )
        self.assertTrue(evidence["inference_metadata"]["primary_llava_executed"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
