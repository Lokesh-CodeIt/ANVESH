"""
MedAuth-VLM: Secure Database Backup & Verification Tool
Performs a pre-import pg_dump backup of medauth_vlm and verifies its recoverability.
Never prints passwords or secrets to stdout or logs.
"""

import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv

WORKSPACE_ROOT = Path(r"c:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT")
BACKUP_DIR = WORKSPACE_ROOT / "backups"
ENV_PATH = WORKSPACE_ROOT / ".env"

load_dotenv(dotenv_path=ENV_PATH)
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[ERROR] DATABASE_URL is not set.")
    sys.exit(1)

parsed = urlparse(db_url)
db_host = parsed.hostname or "localhost"
db_port = str(parsed.port or 5432)
db_name = parsed.path.lstrip("/")
db_user = parsed.username or "postgres"
db_password = parsed.password or ""

BACKUP_DIR.mkdir(parents=True, exist_ok=True)
timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_filename = f"medauth_vlm_pre_import_{timestamp_str}.sql"
backup_filepath = BACKUP_DIR / backup_filename

if backup_filepath.exists():
    print(f"[ERROR] Backup file already exists: {backup_filepath}")
    sys.exit(1)

print("=" * 80)
print("MEDAUTH-VLM: CREATING PRE-IMPORT DATABASE BACKUP")
print("=" * 80)
print(f"Target DB   : {db_name} on {db_host}:{db_port}")
print(f"DB User     : {db_user}")
print(f"Backup File : {backup_filepath.name}")

# Prepare environment for pg_dump without exposing password on command line
env = os.environ.copy()
if db_password:
    env["PGPASSWORD"] = db_password

pg_dump_cmd = [
    "pg_dump",
    "-h", db_host,
    "-p", db_port,
    "-U", db_user,
    "-d", db_name,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-f", str(backup_filepath)
]

try:
    proc = subprocess.run(
        pg_dump_cmd,
        env=env,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    print("[pg_dump] Backup executed successfully.")
except subprocess.CalledProcessError as e:
    print(f"[ERROR] pg_dump failed with return code {e.returncode}: {e.stderr}")
    sys.exit(1)

# Verification Phase
print("\n--- VERIFYING BACKUP RECOVERABILITY & CONTENTS ---")
if not backup_filepath.exists():
    print("[ERROR] Backup file was not created!")
    sys.exit(1)

sz = backup_filepath.stat().st_size
print(f"Backup Size : {sz:,} bytes ({sz / (1024*1024):.2f} MB)")
if sz < 10000:
    print("[ERROR] Backup size is suspiciously small!")
    sys.exit(1)

# Hash backup
h = hashlib.sha256()
with open(backup_filepath, "rb") as f:
    while chunk := f.read(65536):
        h.update(chunk)
backup_hash = h.hexdigest()
print(f"Backup SHA256: {backup_hash}")

# Check contents
with open(backup_filepath, "r", encoding="utf-8", errors="ignore") as f:
    sql_content = f.read()

required_table_signatures = [
    "CREATE TABLE public.cases",
    "CREATE TABLE public.case_images",
    "CREATE TABLE public.evidence",
    "CREATE TABLE public.policies",
    "CREATE TABLE public.reviews",
]

copy_signatures = [
    "COPY public.cases",
    "COPY public.case_images",
    "COPY public.evidence",
    "COPY public.policies",
    "COPY public.reviews",
]

all_signatures_present = True
for sig in required_table_signatures:
    if sig in sql_content:
        print(f"  [OK] Found table DDL: {sig}")
    else:
        print(f"  [FAIL] Missing DDL: {sig}")
        all_signatures_present = False

for sig in copy_signatures:
    if sig in sql_content:
        print(f"  [OK] Found data block: {sig}")
    else:
        print(f"  [FAIL] Missing data block: {sig}")
        all_signatures_present = False

if not all_signatures_present:
    print("[ERROR] Backup verification failed: critical table DDL or COPY blocks missing!")
    sys.exit(1)

# Metadata save
meta_filepath = BACKUP_DIR / f"{backup_filename}.meta.json"
meta = {
    "backup_file": backup_filename,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "database": db_name,
    "host": db_host,
    "port": db_port,
    "size_bytes": sz,
    "sha256": backup_hash,
    "verified": True,
    "tables_verified": ["cases", "case_images", "evidence", "policies", "reviews"]
}
import json
with open(meta_filepath, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

print(f"\nSaved metadata to {meta_filepath.name}")
print("=" * 80)
print("DATABASE BACKUP AND VERIFICATION COMPLETED SUCCESSFULLY")
print("=" * 80)
