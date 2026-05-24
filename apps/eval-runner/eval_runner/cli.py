import click


@click.group()
def main() -> None:
    """Atlas evaluation CLI."""


@main.command()
def run() -> None:
    """Run evaluation."""
    click.echo("atlas-eval run — not yet implemented (Module 5)")
