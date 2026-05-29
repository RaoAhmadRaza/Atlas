from __future__ import annotations

import asyncio
import json
from pathlib import Path

import click

from eval_runner.compare import compare_reports
from eval_runner.config import load_config
from eval_runner.dataset import load_jsonl
from eval_runner.report import write_report
from eval_runner.runner import build_runner


@click.group()
def main() -> None:
    """Atlas evaluation CLI."""


@main.command()
@click.option("--config", required=True, type=click.Path(exists=True), help="YAML eval config")
@click.option("--dataset", required=True, type=click.Path(exists=True), help="JSONL dataset file")
@click.option("--out", default="evals/reports", show_default=True, help="Output directory")
def run(config: str, dataset: str, out: str) -> None:
    """Run evaluation against a dataset."""
    cfg = load_config(config)
    questions = load_jsonl(dataset)
    if not questions:
        raise click.ClickException("Dataset is empty")
    click.echo(f"Running {cfg.name} on {len(questions)} questions …")
    runner = build_runner(cfg, questions)
    result = asyncio.run(runner.run(questions, dataset_name=Path(dataset).stem))
    report_path = write_report(result, out)
    r5 = f"{result.recall_at_5:.4f}"
    mrr_v = f"{result.mrr:.4f}"
    ndcg_v = f"{result.ndcg_at_10:.4f}"
    click.echo(f"Recall@5={r5}  MRR={mrr_v}  NDCG@10={ndcg_v}")
    click.echo(f"Report written to {report_path}")


@main.command()
@click.argument("report_a", type=click.Path(exists=True))
@click.argument("report_b", type=click.Path(exists=True))
def compare(report_a: str, report_b: str) -> None:
    """Compare two eval reports using paired bootstrap CI."""
    result = compare_reports(report_a, report_b)
    click.echo(json.dumps(result, indent=2))


@main.command()
@click.argument("report", type=click.Path(exists=True))
@click.option("--format", "fmt", type=click.Choice(["json", "markdown"]), default="markdown")
def report(report: str, fmt: str) -> None:
    """Print a formatted eval report."""
    data = json.loads(Path(report).read_text())
    if fmt == "markdown":
        lines = [
            f"## Eval Report — {data.get('config_name', '?')} on {data.get('dataset', '?')}",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Recall@5 | {data.get('recall_at_5', '—')} |",
            f"| Recall@10 | {data.get('recall_at_10', '—')} |",
            f"| MRR | {data.get('mrr', '—')} |",
            f"| NDCG@10 | {data.get('ndcg_at_10', '—')} |",
            f"| Faithfulness | {data.get('faithfulness', '—')} |",
            f"| P95 latency | {data.get('p95_ms', '—')}ms |",
        ]
        click.echo("\n".join(lines))
    else:
        click.echo(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
