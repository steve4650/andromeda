#!/usr/bin/env -S uv run --script
"""Task runner for davisgroup.uk.

Usage:
    make.py [task]

Run with no arguments to see available tasks.
"""

from __future__ import annotations

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
        "-K",
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
        "-K",
        str(ROOT / "ansible" / "playbooks" / "deploy.json"),
        env=env,
    )


def fmt() -> None:
    """format and lint this repo"""
    sh("uv", "run", "ruff", "format")
    sh("uv", "run", "ruff", "check", "--fix", "--unsafe-fixes")
    sh("bun", "i")
    sh("bun", "run", "oxfmt")


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

    actual_roles = {
        entry.name for entry in (ROOT / "ansible" / "roles").iterdir() if entry.is_dir()
    }

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
            print(
                f"{path}:{location}: ansible.builtin.copy must set backup: true (found {backup_value!r})"
            )
        raise SystemExit(1)

    lint_ansible_role_dirs()


def lint() -> None:
    """lint this repo, including checking formatting"""
    sh("uv", "run", "ruff", "format", "--check")
    sh("uv", "run", "ruff", "check")
    lint_ansible()
    sh("bun", "i")
    sh("bun", "run", "oxfmt", "--check")


tasks = {
    "deploy_test": deploy_test,
    "deploy": deploy,
    "fmt": fmt,
    "lint": lint,
    "lint_ansible": lint_ansible,
}


def print_help() -> None:
    print("Usage: make.py [task]\n")
    print("Available tasks:")
    for name in sorted(tasks):
        print(f"  {name}")


def main() -> int:
    if len(sys.argv) <= 1:
        print_help()
        return 0

    task_name = sys.argv[1]

    task = tasks.get(task_name)
    if task is None:
        print(f"Unknown task: {task_name}\n")
        print_help()
        return 1

    task()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
