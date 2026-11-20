"""Stage the reviewed GitHub Pages files for deployment or local preview."""

import argparse
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    ".nojekyll",
    "index.html",
    "assets/atlas/atlas.css",
    "assets/atlas/atlas.js",
    "assets/atlas/winter.css",
    "assets/atlas/gluehwein.webp",
    "assets/atlas/mark.svg",
    "assets/atlas/quartier.svg",
    "assets/atlas/fonts/InstrumentSerif-Regular.ttf",
    "assets/atlas/fonts/InstrumentSerif-Italic.ttf",
    "assets/atlas/fonts/OFL.txt",
    "newsletter/2026-06/index.html",
    "newsletter/2026-08/index.html",
    "newsletter/2026-08/mein-stack.html",
    "newsletter/2026-08/tools.html",
)


def stage(output: Path) -> None:
    output = ROOT / output
    if not output.is_relative_to(ROOT / "_site") or output.resolve() != output:
        raise ValueError("Choose _site or a directory below it without symbolic links.")

    files = {Path(name) for name in PUBLIC_FILES}
    cname = Path("CNAME")
    if (ROOT / cname).exists():
        files.add(cname)
    for name in files:
        source = ROOT / name
        if not source.is_file() or source.resolve() != source:
            raise ValueError(f"Missing or linked public file: {name}")

    directories = {parent for name in files for parent in name.parents}
    for entry in output.rglob("*"):
        name = entry.relative_to(output)
        if entry.resolve() != entry or not (
            (name in files | {cname} and entry.is_file())
            or (name in directories and entry.is_dir())
        ):
            raise ValueError("The staging directory contains an unexpected entry.")

    # Prepare complete copies before replacing individual public files.
    output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as scratch:
        for name in sorted(files):
            copy = Path(scratch) / name
            copy.parent.mkdir(parents=True, exist_ok=True)
            copyfile(ROOT / name, copy)
        for name in sorted(files):
            target = output / name
            target.parent.mkdir(parents=True, exist_ok=True)
            (Path(scratch) / name).replace(target)
    if cname not in files:
        (output / cname).unlink(missing_ok=True)
    print(f"Staged {len(files)} public files in {output}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("_site"))
    try:
        stage(parser.parse_args().output)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Could not stage Pages: {error}\n")
