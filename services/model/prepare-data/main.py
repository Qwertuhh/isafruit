import os
import yaml
from pathlib import Path
from collections import Counter
import re
from rich.console import Console
from rich.table import Table
from rich.prompt import Confirm

# --- Config ---
APP_DIR = Path(__file__).parent
DATASET_DIR = APP_DIR.parent.parent.parent / "public" / "datasets" / "fruits-and-vegetables-detection"
YAML_PATH = DATASET_DIR / "config" / "data.yaml"
TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "val"

console = Console()

def sanitize_class_name(name: str) -> str:
    """Sanitize folder name into a valid identifier (no spaces, no invalid chars)."""
    name = name.replace(" ", "_")
    name = re.sub(r"[^A-Za-z0-9_-]", "", name)
    if name and name[0].isdigit():
        name = f"class_{name}"
    return name

def analyze_dataset():
    """Scan dataset and return class info."""
    if not TRAIN_DIR.exists():
        console.print("[bold red] Train directory not found.[/]")
        return [], {}
    classes = sorted([d.name for d in TRAIN_DIR.iterdir() if d.is_dir()])
    counts = {cls: len(list((TRAIN_DIR / cls).glob("*.jpg"))) +
                    len(list((TRAIN_DIR / cls).glob("*.png")))
              for cls in classes}
    return classes, counts

def show_table(classes, counts):
    """Print dataset summary in a colorful table."""
    table = Table(title="📊 Dataset Analysis", style="cyan")
    table.add_column("Class", style="bold green")
    table.add_column("Images", justify="right", style="yellow")

    for cls in classes:
        table.add_row(cls, str(counts.get(cls, 0)))

    table.add_section()
    table.add_row("[bold magenta]Total Classes[/]", str(len(classes)))
    console.print(table)

def generate_yaml(classes):
    """Write YOLO data.yaml file."""
    yaml_data = {
        "train": str(TRAIN_DIR.relative_to(DATASET_DIR.parent)),
        "val": str(VAL_DIR.relative_to(DATASET_DIR.parent)),
        "nc": len(classes),
        "names": classes  # keep original names with spaces
    }
    YAML_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(YAML_PATH, "w") as f:
        yaml.safe_dump(yaml_data, f, sort_keys=False, allow_unicode=True)
    console.print(f"[bold green] data.yaml created at[/] [cyan]{YAML_PATH}[/]")

def main():
    console.print("[bold cyan] YOLO Dataset Preparation Tool[/] (Ctrl+C to quit)\n")

    classes, counts = analyze_dataset()
    if not classes:
        return
    show_table(classes, counts)

    if YAML_PATH.exists():
        overwrite = Confirm.ask(f"[yellow] {YAML_PATH} already exists. Overwrite?[/]")
        if not overwrite:
            console.print("[red] Cancelled. No changes made.[/]")
            return
    else:
        create = Confirm.ask("[green]Create new data.yaml?[/]")
        if not create:
            console.print("[red]Cancelled. No changes made.[/]")
            return

    generate_yaml(classes)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[bold magenta] Exiting. Goodbye![/]")
