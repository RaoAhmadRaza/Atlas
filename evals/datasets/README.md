# Eval Datasets

## smoke_50.jsonl
50 synthetic questions committed in-repo. Used for CI smoke eval (no external download).
`EVAL_RETRIEVER_SOURCE=fake_seeded` — no live DB needed.

## Full datasets (nightly)
- **HotpotQA**: `python -c "from datasets import load_dataset; ds=load_dataset('hotpot_qa','fullwiki'); ..."`
- **FinanceBench**: https://github.com/patronus-ai/financebench (license required)
- **custom_atlas_800.jsonl**: generated from production tenant (not committed)
