# Git

Conventions:

- `working` is the name of your working branch.
- `other-branch` is the name of another branch.

Scenario: you want `working` to be identical to `other-branch.

```bash
git fetch --all
git checkout working
git reset --hard origin/other-branch
git push -f
```

Scenario: your current working branch looks like you want, but needs a clean
history branching off of main.

```bash
git rebase --strategy recursive -X theirs
```
