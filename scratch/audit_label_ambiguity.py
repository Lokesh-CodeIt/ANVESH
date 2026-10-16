import json

def check_label_ambiguity(json_path):
    data = json.load(open(json_path))
    abn_with_normal_impression = []
    norm_with_abn_findings = []
    
    for item in data:
        cid = item['case_id']
        gt = item['classification']
        prompt = item.get('prompt', '')
        
        imp = ''
        if 'Radiologist Dictated Impression:' in prompt:
            imp = prompt.split('Radiologist Dictated Impression:')[1].split('\n')[0].strip().lower()
        
        find = ''
        if 'Radiologist Dictated Findings:' in prompt:
            find = prompt.split('Radiologist Dictated Findings:')[1].split('Radiologist Dictated Impression:')[0].strip().lower()

        if gt == 'abnormal':
            if any(phrase in imp for phrase in ['no acute', 'unremarkable', 'normal examination', 'no active', 'clear lungs', 'within normal limits']):
                abn_with_normal_impression.append((cid, imp, find[:120]))
        elif gt == 'normal':
            if any(phrase in find for phrase in ['opacity', 'effusion', 'consolidation', 'cardiomegaly', 'fracture', 'pneumothorax', 'infiltrate']):
                norm_with_abn_findings.append((cid, imp[:120], find[:120]))

    return abn_with_normal_impression, norm_with_abn_findings

val_abn_norm_imp, val_norm_abn_find = check_label_ambiguity('anvesh_dataset/val.json')
test_abn_norm_imp, test_norm_abn_find = check_label_ambiguity('anvesh_dataset/test.json')

print(f"VAL:  Abnormal GT with 'No acute abnormality' Impression: {len(val_abn_norm_imp)} / 105 ({len(val_abn_norm_imp)/105*100:.1f}%)")
print(f"TEST: Abnormal GT with 'No acute abnormality' Impression: {len(test_abn_norm_imp)} / 211 ({len(test_abn_norm_imp)/211*100:.1f}%)")

print(f"VAL:  Normal GT with abnormal keywords in text: {len(val_norm_abn_find)} / 106 ({len(val_norm_abn_find)/106*100:.1f}%)")
print(f"TEST: Normal GT with abnormal keywords in text: {len(test_norm_abn_find)} / 211 ({len(test_norm_abn_find)/211*100:.1f}%)")

print("\nExamples of Test cases labeled Abnormal where Impression says normal/no acute:")
for x in test_abn_norm_imp[:8]:
    print(f" Case ID: {x[0]} | Impression: {x[1]} | Findings: {x[2]}")
