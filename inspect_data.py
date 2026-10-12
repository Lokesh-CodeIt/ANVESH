import pandas as pd

pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)

cols_needed = ['PlanId', 'StateCode', 'BenefitName', 'IsCovered',
               'CopayInnTier1', 'CoinsInnTier1', 'LimitQty', 'LimitUnit', 'Exclusions']

df = pd.read_csv(
    r"C:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT\AI_PORJECT_DATASET\CMS Health Insurance Exchange PUFs (insurancepolicy data)\benefits-and-cost-sharing-puf\benefits-and-cost-sharing-puf.csv",
    usecols=cols_needed,
    low_memory=False
)

imaging = df[df['BenefitName'] == 'X-rays and Diagnostic Imaging']

# First, just see IsCovered values that actually exist
print("IsCovered value counts:")
print(imaging['IsCovered'].value_counts(dropna=False))

# Now find rows where it's actually Covered AND has a real copay or coinsurance value
covered_with_values = imaging[
    (imaging['IsCovered'] == 'Covered') &
    (imaging['CopayInnTier1'].notna() | imaging['CoinsInnTier1'].notna())
]

print(f"\nFound {len(covered_with_values)} covered plans with cost-sharing data")
print(covered_with_values.head(5))