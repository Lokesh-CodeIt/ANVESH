from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

print("=" * 60)
print(f"Tables found in database 'medauth_vlm' ({len(tables)} tables):")
print("=" * 60)

for table in sorted(tables):
    print(f"\n[Table] {table}")
    columns = inspector.get_columns(table)
    for col in columns:
        pk = " (PK)" if col.get("primary_key") else ""
        nullable = "NULL" if col.get("nullable") else "NOT NULL"
        print(f"  - {col['name']:<24} {str(col['type']):<20} {nullable}{pk}")

    fks = inspector.get_foreign_keys(table)
    if fks:
        print("  Foreign Keys:")
        for fk in fks:
            print(f"    * {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

    indexes = inspector.get_indexes(table)
    if indexes:
        print("  Indexes:")
        for idx in indexes:
            unique_str = " (UNIQUE)" if idx.get("unique") else ""
            print(f"    * {idx['name']}: {idx['column_names']}{unique_str}")

print("\n" + "=" * 60)
print("Schema verification complete!")
print("=" * 60)
