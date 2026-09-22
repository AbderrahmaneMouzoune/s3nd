<!--
The title lands on main as the commit, and release-please reads it, so it has to be a
Conventional Commit: `fix: …`, `feat(cli): …`, `docs: …`. CI checks the shape.
-->

## What this changes

<!-- What was wrong or missing, and what is different now. -->

## How it was checked

<!-- The commands you ran, what they were pointed at (the offline suite, a MinIO container, a real bucket), and what you saw. -->

## Checklist

- [ ] `bun run lint`, `bun run type-check` and `bun run test` pass
- [ ] A change in behaviour has a test; a change in an API or a command has its README updated
- [ ] Nothing under `packages/protocol` or `packages/react` imports a storage client
