# Farming Hub project instructions

Current workflow: DEC-170 / WF-165, 2026-11-17. Preserve project-specific business and release protections; remove repeated work.

1. Read the parent PMS `CLOUD_WORK_SYNC.md` at task start. Inspect branch/remote/dirty files, fetch current remote changes and read accessible relevant cloud updates. Record unavailable context once; preserve concurrent local/cloud work.
2. Start with [PROJECT_RULEBOOK.md](docs/PROJECT_RULEBOOK.md). Read only affected module contracts and relevant DEC/WF entries. Historical baseline, reference rulebooks and release reports are lookup sources, not a mandatory full reading list.
3. For UI edits, read [UI rules](docs/standards/UI_UX_RULEBOOK.md) and [brand rules](docs/BRAND_RULEBOOK.md); consult relevant [HIG adaptations](docs/APPLE_HIG_APPLICATION.md)/reference IDs. Minimal only; mascot hidden. Preserve shared navigation, accessibility and dirty forms.
4. Reuse native ESM/domain helpers. Preserve permissions, transaction/revision/retry safety, issued snapshots, financial/stock semantics and audit. No framework rewrite, inferred business values, live demos or unrelated edits. `vms-reference/` is reference material, not the active runtime.
5. Validate the affected behavior. Full final-candidate suites/build in CI can satisfy the full-suite gate without a duplicate local run; use local focused regression and relevant server/standalone/browser checks. Do not reuse evidence after its inputs change.
6. [BACKUP_RESTORE_RUNBOOK.md](docs/BACKUP_RESTORE_RUNBOOK.md) alone defines release classes/recovery. Documentation needs no DB read or deploy. Qualified presentation-only changes use compatible code rollback plus an existing verified archive. Behavior/data/platform changes require fresh full recovery and isolated restore. Verify live SHA/assets/behavior/preservation before claiming publication.
7. Update the owning contract when necessary. Add DEC for a meaningful decision and WF for a changed workflow. Do not repeat the same narrative in six documents. Keep detailed evidence, credentials, databases and backups private. Preserve old decision history.
8. Batch related changes and archive final local learnings once per completed release/review batch. Retain two verified recovery ZIPs and two verified learning ZIPs per the parent policy; use safe cleanup dry-run before pruning.

Small fixes need a concise impact note; substantial architecture/data-volume/concurrency changes still use [engineering standards](docs/standards/ENGINEERING_STANDARDS.md) and current scale risks. No rulebook cleanup authorizes destructive data changes or weaker finance/security rules.

Runtime: `node --env-file=.env server/index.mjs`. Tests: `node --test tests/*.test.mjs`; review build: `node scripts/build.mjs`. See [deployment](docs/COOLIFY_DEPLOYMENT.md).
