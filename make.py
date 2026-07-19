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
from pathlib import Path, PurePath

import pygit2
import structlog

log = structlog.get_logger()


ROOT = pathlib.Path(__file__).resolve().parent


def sh(*args, env=None, check=True):
    command = [str(arg) for arg in args]
    log.info("  sh: " + " ".join(command))
    env_vars = os.environ.copy()
    if env:
        env_vars.update(env)
    subprocess.run(command, cwd=ROOT, env=env_vars, check=check)


def hydrate_secrets() -> None:
    """copy secrets from a local repo into this repo"""
    log.info("task: hydrate_secrets")
    secret_files_path = ROOT / "secret-files.json"
    secret_files_source_path = ROOT / "secret-files-source.json"

    if (not secret_files_path.exists()) or (not secret_files_source_path.exists()):
        log.error("Secret hydration files do not exist...")
        raise SystemExit(1)

    with open(secret_files_path, encoding="utf-8") as f:
        secret_files = json.load(f)
    with open(secret_files_source_path, encoding="utf-8") as f:
        secret_files_source = json.load(f)

    source_dir = pathlib.Path(secret_files_source["source"])
    for secret in secret_files.get("secrets", []):
        source_path = source_dir / secret
        dest_path = ROOT / secret
        if not source_path.exists():
            log.error(f"Secret file {source_path} does not exist; skipping.")
            continue
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        sh("cp", "-v", str(source_path), str(dest_path))


def deploy_test() -> None:
    """run ansible playbook in check mode to test deployment"""
    log.info("task: deploy_test")
    env = {"ANSIBLE_CONFIG": str(ROOT / "ansible" / "ansible.cfg")}
    hydrate_secrets()
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
    log.info("task: deploy")
    env = {"ANSIBLE_CONFIG": str(ROOT / "ansible" / "ansible.cfg")}
    hydrate_secrets()
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
    log.info("task: lint_ansible_role_dirs")
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
            log.error("ERROR: missing ansible role dirs for deploy.json roles:")
            for role in sorted(missing):
                log.error(f"  - {role}")
        if extra:
            log.error("ERROR: some ansible role dirs not listed in deploy.json:")
            for role in sorted(extra):
                log.error(f"  - {role}")
        raise SystemExit(1)


def lint_ansible() -> None:
    """lint Ansible JSON tasks for required ansible.builtin.copy options."""
    log.info("task: lint_ansible")
    missing = []
    for path in sorted(ROOT.glob("ansible/roles/**/tasks/*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for location, task in iter_ansible_copy_tasks(data):
            copy_args = task.get("ansible.builtin.copy")
            if isinstance(copy_args, dict) and copy_args.get("backup") is not True:
                missing.append((path, location, copy_args.get("backup")))

    if missing:
        for path, location, backup_value in missing:
            log.error(f"{path}:{location}: ansible.builtin.copy must set backup: true (found {backup_value!r})")
        raise SystemExit(1)

    lint_ansible_role_dirs()


def lint_secrets(already_hydrated=False) -> None:
    """lint that secrets are not checked into the repo"""
    log.info("task: lint_secrets")
    secret_files_path = ROOT / "secret-files.json"
    if not secret_files_path.exists():
        log.error("Secret files list does not exist; cannot lint secrets.")
        raise SystemExit(1)

    with open(secret_files_path, encoding="utf-8") as f:
        secret_files = json.load(f)

    repo = pygit2.Repository(ROOT)
    for secret_path in secret_files.get("secrets", []):
        # normalize to same format Git should use - no leading ./
        secret_file = PurePath(secret_path)
        if (not Path(secret_file).exists()) and (not already_hydrated):
            log.warning(f"Secret file {secret_file} does not exist; running hydrate_secrets.")
            hydrate_secrets()
        elif already_hydrated:
            log.error(f"Secret file {secret_file} does not exist in this repo.")
            raise SystemExit(1)
        secret_path = str(secret_file)
        try:
            repo.index[secret_path]
            log.error(f"Secret file {secret_path} exists in the repo; it should not be checked in. If this was pushed to GitHub, rotate this secret immediately.")
            raise SystemExit(1)
        except KeyError:
            pass
    log.info("✓ No secret files are checked into the repo.")


tasks = {}


def build_npm() -> None:
    """build node web projects maintained in this repo into dist/"""
    log.info("task: build_npm")
    for project in ["share-location", "chikorita", "freebee"]:
        destination = ROOT / "davisgroup.uk" / "dist" / project
        destination.mkdir(parents=True, exist_ok=True)
        sh("bun", "i", "--cwd", str(ROOT / "davisgroup.uk" / project))
        sh("bun", "run", "--cwd", str(ROOT / "davisgroup.uk" / project), "build")

    sh(
        "rsync",
        "-rv",
        "--delete",
        str(ROOT / "davisgroup.uk" / "freebee" / "api") + "/",
        str(ROOT / "davisgroup.uk" / "dist" / "freebee" / "api") + "/",
    )


def compress() -> None:
    """creates .gz and .zst sidecar files for content in dist/, but only if the compressed file is smaller than the original"""
    log.info("task: compress")
    dist_root = ROOT / "davisgroup.uk" / "dist"
    if not dist_root.exists():
        log.error("No dist directory found; nothing to compress.")
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
    """compile static projects to dist/"""
    log.info("task: build_static")
    sh("bash", str(ROOT / "davisgroup.uk" / "writeups" / "compile"))
    sh("rsync", "-rv", str(ROOT / "davisgroup.uk" / "static") + "/", str(ROOT / "davisgroup.uk" / "dist") + "/")


def build_liturgical() -> None:
    """builds the liturgical calendar maintained in litigurical_calendar"""
    log.info("task: build_liturgical")
    sh("uv", "run", "davisgroup.uk/liturgical_calendar/generate_ical.py")


def lint_csv() -> None:
    """makes sure the liturgical_calendar/liturgy.csv file is valid CSV"""
    log.info("task: lint_csv")
    csv_file = ROOT / "davisgroup.uk" / "liturgical_calendar" / "liturgy.csv"
    try:
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.reader(f, strict=True)
            expected_cols = None
            for row_num, row in enumerate(reader, 1):
                if expected_cols is None:
                    expected_cols = len(row)
                elif len(row) != expected_cols:
                    log.error(f"✗ {csv_file} is invalid CSV: row {row_num} has {len(row)} columns, expected {expected_cols}")
                    sys.exit(1)
        log.info(f"✓ {csv_file} is valid CSV")
    except csv.Error as e:
        log.error(f"✗ {csv_file} is invalid CSV: {e}", file=sys.stderr)
        sys.exit(1)


def commit_hash() -> None:
    """copies current commit hashinto dist/"""
    log.info("task: commit_hash")
    # write output of `git rev-parse HEAD` to dist/commit
    commit_file = ROOT / "davisgroup.uk" / "dist" / "commit"
    with open(commit_file, "w", encoding="utf-8") as f:
        subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, stdout=f, check=True)


def build() -> None:
    """run all build tasks"""
    build_npm()
    build_liturgical()
    build_static()
    commit_hash()
    compress()


def dev() -> None:
    """build, then run a local web server to serve the dist/ directory for development"""
    log.info("task: dev")
    build()
    sh("uv", "run", "python3", "-m", "http.server", "-d", str(ROOT / "davisgroup.uk" / "dist"), "50000")


def fmt() -> None:
    """format and lint this repo"""
    log.info("task: fmt")
    sh("uv", "run", "ruff", "format")
    sh("uv", "run", "ruff", "check", "--fix", "--unsafe-fixes")
    sh("bun", "i")
    sh("bun", "run", "oxlint", "--fix", "--fix-dangerously")
    sh("bun", "run", "oxfmt")


def lint() -> None:
    """lint this repo, including checking formatting"""
    log.info("task: lint")
    sh("uv", "run", "ruff", "format", "--check")
    sh("uv", "run", "ruff", "check")
    sh("uv", "run", "ruff", "format", "--check")
    sh("uv", "run", "ruff", "check")
    sh("bun", "i")
    sh("bun", "run", "oxlint")
    sh("bun", "run", "oxfmt", "--check")
    lint_ansible()
    lint_csv()
    lint_secrets()


tasks = {
    "build_liturgical": build_liturgical,
    "build_npm": build_npm,
    "build_static": build_static,
    "build": build,
    "compress": compress,
    "deploy_test": deploy_test,
    "deploy": deploy,
    "dev": dev,
    "fmt": fmt,
    "hydrate_secrets": hydrate_secrets,
    "lint_ansible": lint_ansible,
    "lint_csv": lint_csv,
    "lint_secrets": lint_secrets,
    "lint": lint,
}


def print_help() -> None:
    print("Usage: uv run make.py [task]\n")
    print("Available tasks:")
    for name in sorted(tasks):
        print(f"  {name}")


def main() -> int:
    if len(sys.argv) <= 1:
        print_help()
        return 0

    task_name = sys.argv[1].lower()

    task = tasks.get(task_name)
    if task is None:
        log.error(f"Unknown task: {task_name}\n")
        print_help()
        return 1

    task()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
