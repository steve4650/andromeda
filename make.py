#!/usr/bin/env -S uv run --script
"""Task runner for davisgroup.uk.

Usage:
    uv run make.py [task]

Run with no arguments to see available tasks.
"""

from __future__ import annotations

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


def lint() -> None:
    """lint this repo, including checking formatting"""
    sh("uv", "run", "ruff", "format", "--check")
    sh("uv", "run", "ruff", "check")
    sh("bun", "i")
    sh("bun", "run", "oxfmt", "--check")


tasks = {
    "deploy_test": deploy_test,
    "deploy": deploy,
    "fmt": fmt,
    "lint": lint,
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
