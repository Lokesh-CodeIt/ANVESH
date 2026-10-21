import sqlite3

conn = sqlite3.connect("medauth.db")
cur = conn.cursor()

for table in ["policies", "cases", "evidence", "submissions"]:
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({table})").fetchall()]
    print(f"\nColumns in {table}:", cols)
    sample = cur.execute(f"SELECT * FROM {table} LIMIT 1").fetchone()
    print(f"Sample row in {table}:", sample[:6] if sample else None)

print("\nCase classification breakdown:")
for r in cur.execute("SELECT classification, COUNT(*) FROM cases GROUP BY classification").fetchall():
    print(" ", r)

print("\nSubmissions breakdown by status:")
for s in cur.execute("SELECT status, ai_status, ai_source, COUNT(*) FROM submissions GROUP BY status, ai_status, ai_source").fetchall():
    print(" ", s)
