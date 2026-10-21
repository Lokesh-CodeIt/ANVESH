import sys, os
sys.path.insert(0, os.path.abspath("."))
from main import app

routes = []
for r in app.routes:
    methods = getattr(r, "methods", None)
    path = getattr(r, "path", None)
    name = getattr(r, "name", None)
    if methods:
        routes.append((sorted(list(methods)), path, name))

print(f"Total API Routes: {len(routes)}")
for m, p, n in sorted(routes, key=lambda x: x[1]):
    print(f"  {','.join(m):<15} {p:<45} ({n})")
