import pandas as pd
import os

def load_case(uid, dataset_dir):
    reports_path = os.path.join(dataset_dir, "archive (7)", "indiana_reports.csv")
    projections_path = os.path.join(dataset_dir, "archive (7)", "indiana_projections.csv")
    images_dir = os.path.join(dataset_dir, "archive (7)", "images", "images_normalized")
    
    reports = pd.read_csv(reports_path)
    projections = pd.read_csv(projections_path)
    
    report_subset = reports[reports['uid'] == uid]
    if report_subset.empty:
        return None
    report = report_subset.iloc[0]
    
    case_projections = projections[projections['uid'] == uid]
    
    images = []
    for _, row in case_projections.iterrows():
        img_path = os.path.join(images_dir, row['filename'])
        images.append({
            'path': img_path,
            'projection': row['projection']
        })
        
    def clean_text(text):
        if pd.isna(text):
            return ""
        return str(text).replace("XXXX", "[REDACTED]")
        
    case_dict = {
        'case_id': int(report['uid']),
        'images': images,
        'indication': clean_text(report['indication']),
        'findings': clean_text(report['findings']),
        'impression': clean_text(report['impression']),
        'requested_procedure': "Chest X-ray (PA and Lateral)"
    }
    return case_dict

def load_policy(plan_id, dataset_dir):
    policy_path = os.path.join(dataset_dir, "CMS Health Insurance Exchange PUFs (insurancepolicy data)", 
                               "benefits-and-cost-sharing-puf", "benefits-and-cost-sharing-puf.csv")
    cols_needed = ['PlanId', 'StateCode', 'BenefitName', 'IsCovered',
                   'CopayInnTier1', 'CoinsInnTier1', 'LimitQty', 'LimitUnit', 'Exclusions']
                   
    df = pd.read_csv(policy_path, usecols=cols_needed, low_memory=False)
    
    # Filter
    filtered = df[(df['PlanId'] == plan_id) & (df['BenefitName'] == 'X-rays and Diagnostic Imaging')]
    if filtered.empty:
        return None
        
    row = filtered.iloc[0]
    
    def handle_nan(val):
        if pd.isna(val):
            return None
        return val
        
    policy_dict = {
        'plan_id': handle_nan(row['PlanId']),
        'state': handle_nan(row['StateCode']),
        'is_covered': handle_nan(row['IsCovered']),
        'copay': handle_nan(row['CopayInnTier1']),
        'coinsurance': handle_nan(row['CoinsInnTier1']),
        'limit_qty': handle_nan(row['LimitQty']),
        'limit_unit': handle_nan(row['LimitUnit']),
        'exclusions': handle_nan(row['Exclusions'])
    }
    return policy_dict

if __name__ == "__main__":
    dataset_dir = r"C:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT\AI_PORJECT_DATASET"
    
    case = load_case(1, dataset_dir)
    print("--- CASE ---")
    import pprint
    pprint.pprint(case)
    
    policy = load_policy("38344AK1060001-02", dataset_dir)
    print("\n--- POLICY ---")
    pprint.pprint(policy)
