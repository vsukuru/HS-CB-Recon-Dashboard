"""
RECON DASHBOARD DATA PROCESSOR
================================
Run this script whenever you have fresh exports from HubSpot and Chargebee.
It reads all source files, computes every control, and writes recon_data.json
which is then embedded into the dashboard.

Usage:
    pip install pandas openpyxl
    python recon_processor.py

Input files expected in the same directory:
    1__HS-Companies.xlsx
    2__Hubspot_Deals.csv
    3__HS_Renewal_population.xlsx
    4__Chargebee_Customers.csv
    5__Chargebee_Subscriptions.csv
    6__Chargebee_Invoices.csv
    7__Chargebee_Payments.csv
    8__Chargebee_CreditNoteLineItems.csv
    9__Recon_framework.xlsx
"""

import pandas as pd
import numpy as np
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def load():
    print("Loading files...")
    hs_co     = pd.read_excel(os.path.join(BASE, '1__HS-Companies.xlsx'))
    hs_deals  = pd.read_csv(os.path.join(BASE, '2__Hubspot_Deals.csv'))
    hs_renew  = pd.read_excel(os.path.join(BASE, '3__HS_Renewal_population.xlsx'))
    cb_cust   = pd.read_csv(os.path.join(BASE, '4__Chargebee_Customers.csv'))
    cb_subs   = pd.read_csv(os.path.join(BASE, '5__Chargebee_Subscriptions.csv'))
    cb_inv    = pd.read_csv(os.path.join(BASE, '6__Chargebee_Invoices.csv'))
    cb_pay    = pd.read_csv(os.path.join(BASE, '7__Chargebee_Payments.csv'))
    cb_cn     = pd.read_csv(os.path.join(BASE, '8__Chargebee_CreditNoteLineItems.csv'))
    return hs_co, hs_deals, hs_renew, cb_cust, cb_subs, cb_inv, cb_pay, cb_cn

def normalize(df, col):
    df[col] = df[col].astype(str).str.strip()
    return df

def compute(hs_co, hs_deals, hs_renew, cb_cust, cb_subs, cb_inv, cb_pay, cb_cn):
    print("Normalizing keys...")
    normalize(hs_co, 'Customer ID')
    normalize(hs_deals, 'Customer ID')
    normalize(hs_renew, 'Customer ID')
    normalize(cb_cust, 'Customer Id')
    normalize(cb_subs, 'customers.id')

    hs_active  = hs_co[hs_co['Customer Status'] == 'Active']
    hs_churned = hs_co[hs_co['Customer Status'] == 'Churned']
    cb_active  = cb_subs[cb_subs['subscriptions.status'] == 'Active']
    cb_cancel  = cb_subs[cb_subs['subscriptions.status'] == 'Cancelled']

    hs_all_ids        = set(hs_co['Customer ID'].dropna())
    hs_active_ids     = set(hs_active['Customer ID'].dropna())
    cb_all_sub_ids    = set(cb_subs['customers.id'].dropna())
    cb_active_ids     = set(cb_active['customers.id'].dropna())
    subs_with_invoice = set(cb_inv['Subscription Id'].dropna().astype(str))

    hs_mrr = hs_active['MRR'].sum()
    cb_mrr = cb_active['subscriptions.mrr'].sum()
    hs_arr = hs_active['ARR ($)'].sum()
    cb_arr = cb_mrr * 12

    # ── Controls ─────────────────────────────────────────────────────────────
    print("Computing controls...")

    # Leakage
    orphan      = len(cb_active[~cb_active['customers.id'].isin(hs_all_ids)])
    no_sub      = len(hs_active[~hs_active['Customer ID'].isin(cb_active_ids)])
    no_inv      = len(cb_active[~cb_active['subscriptions.id'].isin(subs_with_invoice)])
    failed_pay  = len(cb_pay[cb_pay['Status'] == 'Failure'])
    zero_mrr    = len(cb_active[cb_active['subscriptions.mrr'] == 0])

    # Customer
    count_diff  = abs(len(hs_active) - len(cb_active))
    no_card     = len(cb_cust[cb_cust['Card Status'].isna()])

    # Lifecycle
    status_mis  = len(hs_active[hs_active['Customer ID'].isin(cb_all_sub_ids) & ~hs_active['Customer ID'].isin(cb_active_ids)])
    merged_ch   = hs_churned.merge(cb_cancel[['customers.id','subscriptions.cancelled_at']], left_on='Customer ID', right_on='customers.id', how='inner')
    merged_ch['Churn Date'] = pd.to_datetime(merged_ch['Churn Date'], errors='coerce')
    merged_ch['subscriptions.cancelled_at'] = pd.to_datetime(merged_ch['subscriptions.cancelled_at'], errors='coerce')
    churn_mis   = len(merged_ch[merged_ch['Churn Date'].notna() & merged_ch['subscriptions.cancelled_at'].notna() & (abs((merged_ch['Churn Date'] - merged_ch['subscriptions.cancelled_at']).dt.days) > 7)])

    cw_deals    = hs_deals[hs_deals['Deal Stage'] == 'Closed Won']
    cw_no_sub   = len(cw_deals) - cw_deals['Customer ID'].isin(cb_subs['customers.id']).sum()

    # Revenue
    pay_due     = len(cb_inv[cb_inv['Invoice Status'].isin(['Payment Due', 'Not Paid'])])

    # Renewal Integrity
    cw_renew    = hs_renew[hs_renew['Deal Stage'] == 'Closed Won']
    merged_cw   = cw_renew.merge(cb_subs[['customers.id','subscriptions.status','subscriptions.mrr']], left_on='Customer ID', right_on='customers.id', how='left')
    rn_cancelled= len(merged_cw[merged_cw['subscriptions.status'] == 'Cancelled'])
    rn_missing  = len(hs_renew[~hs_renew['Customer ID'].isin(cb_subs['customers.id'])])

    mrr_cw      = merged_cw[merged_cw['subscriptions.mrr'].notna() & merged_cw['Amount'].notna()].copy()
    mrr_cw['diff'] = abs(mrr_cw['Amount'] / 12 - mrr_cw['subscriptions.mrr'])
    rn_mrr_mis  = len(mrr_cw[mrr_cw['diff'] > 5])

    controls = [
        {"id":"c1","category":"Leakage","name":"Orphan Subscription","total":len(cb_active),"failing":orphan,"logic":"CB subscription exists but no HS company record"},
        {"id":"c2","category":"Leakage","name":"Customer Without Subscription","total":len(hs_active),"failing":no_sub,"logic":"HS Active customer but no CB active subscription"},
        {"id":"c3","category":"Leakage","name":"Active Sub Without Invoice","total":len(cb_active),"failing":no_inv,"logic":"Active subscription but no invoice generated"},
        {"id":"c4","category":"Leakage","name":"Failed Payment Aging","total":len(cb_pay),"failing":failed_pay,"logic":"Failed payments unresolved beyond threshold"},
        {"id":"c5","category":"Leakage","name":"Zero Value Subscription","total":len(cb_active),"failing":zero_mrr,"logic":"Active subscription with $0 MRR"},
        {"id":"c6","category":"Customer","name":"Active Customer Count Recon","total":len(hs_active),"failing":count_diff,"logic":f"HS Active: {len(hs_active):,} vs CB Active: {len(cb_active):,}"},
        {"id":"c7","category":"Customer","name":"Active Customer Record Match","total":len(hs_active),"failing":no_sub,"logic":"HS companies not matched to CB customers"},
        {"id":"c8","category":"Customer","name":"Invoice Without Payment Method","total":len(cb_cust),"failing":no_card,"logic":"CB customer missing card/payment method"},
        {"id":"c9","category":"Lifecycle","name":"Status Mismatch","total":len(hs_active),"failing":status_mis,"logic":"HS Active but CB subscription not active"},
        {"id":"c10","category":"Lifecycle","name":"Churn Date Alignment","total":len(merged_ch),"failing":churn_mis,"logic":"HS churn date vs CB cancelled date differ >7 days"},
        {"id":"c11","category":"Lifecycle","name":"Closed-Won Deal Without Subscription","total":len(cw_deals),"failing":int(cw_no_sub),"logic":"HS deal closed but subscription missing in CB"},
        {"id":"c12","category":"Revenue","name":"MRR Reconciliation","total":1,"failing":1 if abs(hs_mrr-cb_mrr)>100 else 0,"logic":f"HS MRR ${hs_mrr:,.0f} vs CB MRR ${cb_mrr:,.0f} — Delta ${abs(hs_mrr-cb_mrr):,.0f}","isSummary":True,"hsMRR":round(hs_mrr),"cbMRR":round(cb_mrr)},
        {"id":"c13","category":"Revenue","name":"ARR Reconciliation","total":1,"failing":1 if abs(hs_arr-cb_arr)>1000 else 0,"logic":f"HS ARR ${hs_arr:,.0f} vs CB ARR ${cb_arr:,.0f} — Delta ${abs(hs_arr-cb_arr):,.0f}","isSummary":True,"hsARR":round(hs_arr),"cbARR":round(cb_arr)},
        {"id":"c14","category":"Revenue","name":"Invoice Amount Validation","total":len(cb_inv),"failing":pay_due,"logic":"Invoices with Payment Due or Not Paid status"},
        {"id":"c15","category":"Renewal Integrity","name":"Renewal Closed but Sub Cancelled","total":len(cw_renew),"failing":rn_cancelled,"logic":"HS Renewal Closed Won but CB subscription Cancelled"},
        {"id":"c16","category":"Renewal Integrity","name":"Renewal Closed but Sub Missing","total":len(hs_renew),"failing":rn_missing,"logic":"Renewal deal exists but no CB subscription linked"},
        {"id":"c17","category":"Renewal Integrity","name":"Renewal MRR vs Billing MRR","total":len(mrr_cw),"failing":rn_mrr_mis,"logic":"HS Renewal ARR/12 ≠ CB subscription MRR by >$5"},
    ]

    # ── Record-level recon ────────────────────────────────────────────────────
    print("Building record-level recon...")
    recon = hs_active.merge(
        cb_active[['customers.id','subscriptions.mrr','subscriptions.status','subscriptions.plan_id']].drop_duplicates('customers.id'),
        left_on='Customer ID', right_on='customers.id', how='left'
    )

    def issues(row):
        out = []
        if pd.isna(row.get('customers.id')): out.append("No CB Subscription")
        elif pd.notna(row['MRR']) and pd.notna(row['subscriptions.mrr']) and abs(row['MRR'] - row['subscriptions.mrr']) > 5:
            out.append("MRR Mismatch")
        return out

    recon['issues'] = recon.apply(issues, axis=1)
    sample = pd.concat([recon[recon['issues'].apply(len)==0].head(15), recon[recon['issues'].apply(len)>0].head(30)]).head(50)

    records = []
    for _, r in sample.iterrows():
        has_cb = pd.notna(r.get('customers.id'))
        records.append({
            'id': str(r['Record ID']),
            'company': str(r['Company name']).strip(),
            'customerId': str(r['Customer ID']),
            'hsMRR': round(float(r['MRR']),2) if pd.notna(r['MRR']) else None,
            'hsARR': round(float(r['ARR ($)']),2) if pd.notna(r['ARR ($)']) else None,
            'cbStatus': str(r['subscriptions.status']) if has_cb else None,
            'cbMRR': round(float(r['subscriptions.mrr']),2) if has_cb and pd.notna(r['subscriptions.mrr']) else None,
            'cbPlan': str(r['subscriptions.plan_id']) if has_cb and pd.notna(r.get('subscriptions.plan_id')) else None,
            'issues': r['issues'],
        })

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = {
        "hsTotalCompanies": int(len(hs_co)),
        "hsActiveCompanies": int(len(hs_active)),
        "cbTotalCustomers": int(len(cb_cust)),
        "cbActiveSubscriptions": int(len(cb_active)),
        "hsTotalMRR": round(hs_mrr),
        "cbTotalMRR": round(cb_mrr),
        "hsTotalARR": round(hs_arr),
        "cbTotalARR": round(cb_arr),
        "totalCredits": round(float(cb_cn['Amount'].sum())),
        "failedPayments": failed_pay,
        "renewalOutcomes": hs_renew['Renewal Outcome'].value_counts().to_dict(),
    }

    return {"controls": controls, "records": records, "summary": summary}

if __name__ == "__main__":
    hs_co, hs_deals, hs_renew, cb_cust, cb_subs, cb_inv, cb_pay, cb_cn = load()
    data = compute(hs_co, hs_deals, hs_renew, cb_cust, cb_subs, cb_inv, cb_pay, cb_cn)
    out = os.path.join(BASE, 'recon_data.json')
    with open(out, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"\n✓ Done! Output written to: {out}")
    print(f"  Controls : {len(data['controls'])}")
    print(f"  Records  : {len(data['records'])}")
    print(f"  HS MRR   : ${data['summary']['hsTotalMRR']:,}")
    print(f"  CB MRR   : ${data['summary']['cbTotalMRR']:,}")
