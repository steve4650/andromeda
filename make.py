#!/usr/bin/env -S uv run --script
"""Task runner for davisgroup.uk.

Usage:
    make.py [task]

Run with no arguments to see available tasks.
"""

from __future__ import annotations

import csv
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent


def sh(*args, env=None, check=True):
    command = [str(arg) for arg in args]
    print("+", " ".join(command))
    env_vars = os.environ.copy()
    if env:
        env_vars.update(env)
    subprocess.run(command, cwd=ROOT, env=env_vars, check=check)


def deploy_test() -> None:
    """run ansible playbook in check mode to test deployment"""
    env = {"ANSIBLE_CONFIG": str(ROOT / "ansible" / "ansible.cfg")}
    sh(
        "ansible-playbook",
        "--ask-vault-pass",
        "--diff",
        "--check",
        "-vv",
        str(ROOT / "ansible" / "playbooks" / "deploy.json"),
        env=env,
    )


def deploy() -> None:
    """run ansible playbook to deploy to Production"""
    env = {"ANSIBLE_CONFIG": str(ROOT / "ansible" / "ansible.cfg")}
    sh(
        "ansible-playbook",
        "--ask-vault-pass",
        str(ROOT / "ansible" / "playbooks" / "deploy.json"),
        env=env,
    )


def iter_ansible_copy_tasks(node, location="root"):
    if isinstance(node, list):
        for index, item in enumerate(node):
            yield from iter_ansible_copy_tasks(item, f"{location}[{index}]")
    elif isinstance(node, dict):
        if "ansible.builtin.copy" in node:
            yield location, node
        for key, value in node.items():
            yield from iter_ansible_copy_tasks(value, f"{location}.{key}")


def lint_ansible_role_dirs() -> None:
    """lint that ansible/roles dirs match roles in deploy.json."""
    deploy_path = ROOT / "ansible" / "playbooks" / "deploy.json"
    data = json.loads(deploy_path.read_text(encoding="utf-8"))
    expected_roles = set()
    for play in data:
        if isinstance(play, dict):
            for role in play.get("roles", []):
                if isinstance(role, dict) and "name" in role:
                    expected_roles.add(role["name"])
                elif isinstance(role, str):
                    expected_roles.add(role)

    actual_roles = {entry.name for entry in (ROOT / "ansible" / "roles").iterdir() if entry.is_dir()}

    missing = expected_roles - actual_roles
    extra = actual_roles - expected_roles
    if missing or extra:
        if missing:
            print("ERROR: missing ansible role dirs for deploy.json roles:")
            for role in sorted(missing):
                print(f"  - {role}")
        if extra:
            print("ERROR: some ansible role dirs not listed in deploy.json:")
            for role in sorted(extra):
                print(f"  - {role}")
        raise SystemExit(1)


def lint_ansible() -> None:
    """lint Ansible JSON tasks for required ansible.builtin.copy options."""
    print("+ linting Ansible tasks...")
    missing = []
    for path in sorted(ROOT.glob("ansible/roles/**/tasks/*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for location, task in iter_ansible_copy_tasks(data):
            copy_args = task.get("ansible.builtin.copy")
            if isinstance(copy_args, dict) and copy_args.get("backup") is not True:
                missing.append((path, location, copy_args.get("backup")))

    if missing:
        for path, location, backup_value in missing:
            print(f"{path}:{location}: ansible.builtin.copy must set backup: true (found {backup_value!r})")
        raise SystemExit(1)

    lint_ansible_role_dirs()


tasks = {}


def build_npm() -> None:
    """build node web projects maintained in this repo into dist/"""
    for project in ["share-location", "chikorita", "freebee"]:
        destination = ROOT / "dist" / project
        destination.mkdir(parents=True, exist_ok=True)
        sh("bun", "i", "--cwd", str(ROOT / project))
        sh("bun", "run", "--cwd", str(ROOT / project), "build")

    sh(
        "rsync",
        "-rv",
        "--delete",
        str(ROOT / "freebee" / "api") + "/",
        str(ROOT / "dist" / "freebee" / "api") + "/",
    )


def compress() -> None:
    """creates .gz and .zst sidecar files for content in dist/, but only if the compressed file is smaller than the original"""
    dist_root = ROOT / "dist"
    if not dist_root.exists():
        print("No dist directory found; nothing to compress.")
        return

    for path in dist_root.rglob("*"):
        if path.is_dir():
            continue
        if path.suffix in {".gz", ".zst"}:
            continue

        sh("gzip", "-fk", str(path))
        sh("zstd", "-fk", str(path))

        for suffix in [".gz", ".zst"]:
            compressed = pathlib.Path(str(path) + suffix)
            if compressed.exists() and path.stat().st_size <= compressed.stat().st_size:
                compressed.unlink()


def build_static() -> None:
    """compile Markdown writeupes in writeups/"""
    sh("bash", str(ROOT / "writeups" / "compile"))


def build_liturgical() -> None:
    """builds the liturgical calendar maintained in litigurical_calendar"""
    sh("uv", "run", "liturgical_calendar/generate_ical.py")


def lint_csv() -> None:
    """makes sure the liturgical_calendar/liturgy.csv file is valid CSV"""
    csv_file = ROOT / "liturgical_calendar" / "liturgy.csv"
    try:
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.reader(f, strict=True)
            expected_cols = None
            for row_num, row in enumerate(reader, 1):
                if expected_cols is None:
                    expected_cols = len(row)
                elif len(row) != expected_cols:
                    print(
                        f"✗ {csv_file} is invalid CSV: row {row_num} has {len(row)} columns, expected {expected_cols}",
                        file=sys.stderr,
                    )
                    sys.exit(1)
        print(f"✓ {csv_file} is valid CSV")
    except csv.Error as e:
        print(f"✗ {csv_file} is invalid CSV: {e}", file=sys.stderr)
        sys.exit(1)


def cp_static() -> None:
    """copies static web files into dist/"""
    sh("rsync", "-rv", str(ROOT / "static") + "/", str(ROOT / "dist") + "/")


def commit_hash() -> None:
    """copies current commit hashinto dist/"""
    # write output of `git rev-parse HEAD` to dist/commit
    commit_file = ROOT / "dist" / "commit"
    with open(commit_file, "w", encoding="utf-8") as f:
        subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, stdout=f, check=True)


def build() -> None:
    """run all build tasks"""
    build_npm()
    build_liturgical()
    build_static()
    cp_static()
    commit_hash()
    compress()


def dev() -> None:
    """build, then run a local web server to serve the dist/ directory for development"""
    build()
    sh("python3", "-m", "http.server", "-d", str(ROOT / "dist"), "50000")


def fmt() -> None:
    """format and lint this repo"""
    sh("uv", "run", "ruff", "format")
    sh("uv", "run", "ruff", "check", "--fix", "--unsafe-fixes")
    sh("bun", "i")
    sh("bun", "run", "oxlint", "--fix", "--fix-dangerously")
    sh("bun", "run", "oxfmt")


def lint() -> None:
    """lint this repo, including checking formatting"""
    sh("uv", "run", "ruff", "format", "--check")
    sh("uv", "run", "ruff", "check")
    sh("bun", "i")
    sh("bun", "run", "oxlint")
    sh("bun", "run", "oxfmt", "--check")
    lint_ansible()
    lint_csv()


tasks = {
    "build_npm": build_npm,
    "compress": compress,
    "build_static": build_static,
    "build_liturgical": build_liturgical,
    "cp_static": cp_static,
    "lint_csv": lint_csv,
    "build": build,
    "deploy_test": deploy_test,
    "deploy": deploy,
    "dev": dev,
    "fmt": fmt,
    "lint": lint,
    "lint_ansible": lint_ansible,
}


def print_help() -> None:
    print("Usage: uv run make.py [task]\n")
    print("Available tasks:")
    for name in sorted(tasks):
        print(f"  {name}")
    print("\nDefault task: fmt")


def main() -> int:
    if len(sys.argv) <= 1:
        print_help()
        return 0

    task_name = sys.argv[1].lower()

    task = tasks.get(task_name)
    if task is None:
        print(f"Unknown task: {task_name}\n")
        print_help()
        return 1

    task()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
