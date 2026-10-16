import json
import pandas as pd

v2_preds = pd.read_csv("reports/v2_llava_test_predictions.csv")
v3_preds = pd.read_csv("reports/v3_llava_test_predictions.csv")

data = json.load(open("anvesh_dataset/test.json"))
ambig_ids = set()
for item in data:
    if item["classification"] == "abnormal":
        prompt = item.get("prompt", "").lower()
        if "radiologist dictated impression:" in prompt:
            imp = prompt.split("radiologist dictated impression:")[1].split("\n")[0].strip()
            if any(phrase in imp for phrase in ["no acute", "unremarkable", "normal examination", "no active", "clear lungs", "within normal limits"]):
                ambig_ids.add(item["case_id"])

print(f"Ambiguous Abnormal Cases in Test: {len(ambig_ids)}")

df_v2_ambig = v2_preds[v2_preds["case_id"].isin(ambig_ids)]
df_v3_ambig = v3_preds[v3_preds["case_id"].isin(ambig_ids)]

fn_v2 = (df_v2_ambig["prediction"] == "normal").sum()
fn_v3 = (df_v3_ambig["predicted_label"] == "normal").sum()

print("\nv2 Predictions on these 110 ambiguous cases:")
print(df_v2_ambig["prediction"].value_counts())
print(f"  False Negative Rate on this subset: {fn_v2} / {len(df_v2_ambig)} ({fn_v2 / len(df_v2_ambig)*100:.1f}%)")

print("\nv3 Predictions on these 110 ambiguous cases:")
print(df_v3_ambig["predicted_label"].value_counts())
print(f"  False Negative Rate on this subset: {fn_v3} / {len(df_v3_ambig)} ({fn_v3 / len(df_v3_ambig)*100:.1f}%)")

# Now check the remaining 101 unambiguous abnormal cases (true acute pathology)
acute_ids = set(item["case_id"] for item in data if item["classification"] == "abnormal" and item["case_id"] not in ambig_ids)
print(f"\nUnambiguous Acute Abnormal Cases in Test: {len(acute_ids)}")

df_v2_acute = v2_preds[v2_preds["case_id"].isin(acute_ids)]
df_v3_acute = v3_preds[v3_preds["case_id"].isin(acute_ids)]

tp_v2 = (df_v2_acute["prediction"] == "abnormal").sum()
tp_v3 = (df_v3_acute["predicted_label"] == "abnormal").sum()

print("\nv2 Predictions on 101 Acute Abnormal cases:")
print(df_v2_acute["prediction"].value_counts())
print(f"  Sensitivity on Acute Cases: {tp_v2} / {len(df_v2_acute)} ({tp_v2 / len(df_v2_acute)*100:.1f}%)")

print("\nv3 Predictions on 101 Acute Abnormal cases:")
print(df_v3_acute["predicted_label"].value_counts())
print(f"  Sensitivity on Acute Cases: {tp_v3} / {len(df_v3_acute)} ({tp_v3 / len(df_v3_acute)*100:.1f}%)")
