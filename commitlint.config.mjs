// Commit messages follow Conventional Commits (`feat(scope): …`, `fix: …`),
// checked by a commit-msg hook (simple-git-hooks, installed by `npm install`)
// and again in CI for every push. semantic-release reads them to decide the
// next version: `feat` → minor, `fix`/`perf` → patch, `BREAKING CHANGE` →
// major. See .releaserc.json.
export default {
  extends: ["@commitlint/config-conventional"],
  // The release commit carries the generated release notes in its body,
  // whose long lines and links aren't the author's to shorten.
  ignores: [(message) => message.startsWith("chore(release):")],
};
