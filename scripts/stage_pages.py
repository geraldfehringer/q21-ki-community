"""Stage the reviewed GitHub Pages files for deployment or local preview."""

import argparse
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    ".nojekyll",
    "index.html",
    "assets/observatorium/observatorium.css",
    "assets/observatorium/observatorium.js",
    "assets/observatorium/december.css",
    "assets/observatorium/quiz.css",
    "assets/observatorium/quiz.js",
    "assets/observatorium/zeichen.svg",
    "assets/observatorium/quartier.webp",
    "assets/observatorium/gerald-fehringer.webp",
    "assets/observatorium/gerald-fehringer-siebdruck.webp",
    "assets/observatorium/fonts/dm-sans.ttf",
    "assets/observatorium/fonts/dm-sans-license.txt",
    "assets/atlas/gluehwein.webp",
    "assets/atlas/fonts/InstrumentSerif-Italic.ttf",
    "assets/atlas/fonts/OFL.txt",
    "newsletter/2026-06/index.html",
    "newsletter/2026-08/index.html",
    "newsletter/2026-08/mein-stack.html",
    "newsletter/2026-08/tools.html",
)

# These previously staged assets can be removed from an existing local build
# only when the staged copies still match their source files.
RETIRED_FILES = {
    Path("assets/atlas/atlas.css"),
    Path("assets/atlas/atlas.js"),
    Path("assets/atlas/winter.css"),
    Path("assets/atlas/mark.svg"),
    Path("assets/atlas/quartier.svg"),
    Path("assets/atlas/fonts/InstrumentSerif-Regular.ttf"),
}


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
    retired_copies = []
    for entry in output.rglob("*"):
        name = entry.relative_to(output)
        if entry.resolve() != entry:
            raise ValueError("The staging directory contains a linked entry.")
        if name in RETIRED_FILES and entry.is_file():
            source = ROOT / name
            if not source.is_file() or source.resolve() != source or entry.read_bytes() != source.read_bytes():
                raise ValueError(f"Cannot verify obsolete staged copy: {name}")
            retired_copies.append(entry)
            continue
        if not (
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
    for entry in retired_copies:
        entry.unlink()
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
