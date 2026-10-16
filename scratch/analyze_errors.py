import pandas as pd
import numpy as np

df = pd.read_csv('reports/v2_llava_test_predictions.csv')
y_true = (df['ground_truth'] == 'abnormal').astype(int).values
y_pred = (df['prediction'] == 'abnormal').astype(int).values
probs = df['p_abnormal'].values
logit_diffs = df['logit_diff'].values

df['error_type'] = 'CORRECT'
df.loc[(df['ground_truth'] == 'abnormal') & (df['prediction'] == 'normal'), 'error_type'] = 'FN'
df.loc[(df['ground_truth'] == 'normal') & (df['prediction'] == 'abnormal'), 'error_type'] = 'FP'
df.loc[(df['ground_truth'] == 'abnormal') & (df['prediction'] == 'abnormal'), 'error_type'] = 'TP'
df.loc[(df['ground_truth'] == 'normal') & (df['prediction'] == 'normal'), 'error_type'] = 'TN'

print("=== ERROR TYPE COUNTS ===")
print(df['error_type'].value_counts())

print("\n=== PROBABILITY ABNORMAL DISTRIBUTIONS ===")
for et in ['TP', 'TN', 'FN', 'FP']:
    subset = df[df['error_type'] == et]
    print(f"{et} (n={len(subset)}): Mean P(abn) = {subset['p_abnormal'].mean():.4f} +/- {subset['p_abnormal'].std():.4f}, LogitDiff = {subset['logit_diff'].mean():.4f}")

# Near-boundary analysis: cases with P(abnormal) between 0.40 and 0.60
near_boundary = df[(df['p_abnormal'] >= 0.40) & (df['p_abnormal'] <= 0.60)]
print(f"\nCases near decision boundary [0.40, 0.60]: {len(near_boundary)} ({len(near_boundary)/len(df)*100:.1f}%)")
print(near_boundary['error_type'].value_counts())
