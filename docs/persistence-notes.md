# Persistence Notes

## Recommended model

Use a hybrid persistence model:

- Course packages are stored as files.
- App state and user state are stored in a local database.

This keeps course content portable for future peer-to-peer sharing while giving the app a better place to store local-only state.

## Filesystem responsibilities

The filesystem should remain the source of truth for course package content:

- `course.json`
- sections
- lessons
- exercises
- localized content
- assets

Draft courses and published courses should both use the same package format on disk.

This avoids a second "convert draft to files" phase later and keeps export, publish, backup, and sharing workflows simpler.

## Database responsibilities

The local database should store app-level and user-level state such as:

- favorites
- bookmarks
- bookmark folders
- started courses
- finished courses
- progress
- recent activity
- last opened course
- draft metadata
- local indexing metadata

The database should reference courses by stable identifiers such as `courseId`, not duplicate the full course content structure.

## Drafts

Drafts should stay file-backed.

Do not treat the database as the canonical store for draft section, lesson, or exercise content. That would introduce a second representation of the course and create extra complexity when exporting or publishing.

Instead:

- keep draft content in files
- track draft status and local metadata in the database
- use the database to support UI and workflow state around those files

## Safety and corruption concerns

The main risk is not "files vs database". The real risk is unsafe write behavior.

To make file-backed drafts safe:

1. Use atomic writes.
2. Validate content before replacing files.
3. Add autosave.
4. Keep local snapshots or revision history for drafts.
5. Store recovery metadata in the database.

## Write safety guidelines

When writing course files:

- write to a temporary file first
- validate before replacing the target
- replace files atomically
- avoid partial in-place writes

This reduces the chance of corrupting a draft if the app crashes during save.

## Recovery guidelines

The app should eventually support:

- last known good save tracking
- crash recovery markers
- local draft snapshots
- restore from previous snapshot when a save fails

## Architectural rule

Use this separation of concerns:

- Filesystem: canonical course content
- Database: canonical user/app state around course content

This model is the best fit for:

- future open source maintainability
- local-first authoring
- portable course packages
- future peer-to-peer sharing
