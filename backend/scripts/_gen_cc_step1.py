import os, sys
sys.stdout.reconfigure(encoding="utf-8")

# Read the AA template
tpl_path = os.path.join("scripts", "_aria_cases_batch_AA.py")
with open(tpl_path, "r", encoding="utf-8") as f:
    template = f.read()
print(f"Template loaded: {len(template)} bytes")
