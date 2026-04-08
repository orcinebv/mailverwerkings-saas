# Contributing to mailverwerkings-saas

Thank you for contributing! Please follow these guidelines to keep the codebase clean and reviews efficient.

## Branch Naming

All branches must follow this convention:

- **Feature work:** `feature/<ticket>-short-description`
  - Example: `feature/ORC-12-add-email-parser`
- **Bug fixes:** `fix/<ticket>-short-description`
  - Example: `fix/ORC-34-fix-null-sender`

Always reference a ticket ID. If there is no ticket, create one first.

## Pull Request Process

1. Branch off from `main` using the naming convention above.
2. Keep PRs focused — one ticket, one concern.
3. Ensure CI passes before requesting review (lint + tests must be green).
4. Request at least **1 review** from a team member.
5. Squash-merge into `main` using a descriptive commit message.
6. Delete the branch after merge.

## Commit Messages

Use the imperative mood in the subject line:
- `Add email validation for sender field`
- `Fix null pointer in attachment parser`
- `Refactor job queue to use BullMQ`

## Code Standards

- Run `npm run lint` locally before pushing.
- Run `npm test` locally before pushing.
- Do not force-push to `main` or delete protected branches.

## Questions?

Open an issue or reach out to the team via the project board.
