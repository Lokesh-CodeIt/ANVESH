import sqlite3

conn = sqlite3.connect("medauth.db")
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in c.fetchall()]
print("Tables in medauth.db:", tables)

for t in ["cases", "submissions", "evidence"]:
    if t in tables:
        c.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"Count in {t}: {c.fetchone()[0]}")
        c.execute(f"PRAGMA table_info({t})")
        cols = [r[1] for r in c.fetchall()]
        print(f"Columns in {t}: {cols[:8]}")

if "cases" in tables:
    c.execute("SELECT id, case_id, patient_id FROM cases LIMIT 5")
    print("Sample cases:", c.fetchall())
    c.execute("SELECT COUNT(DISTINCT patient_id), COUNT(*) FROM cases")
    print("Distinct patients vs total cases:", c.fetchone())
