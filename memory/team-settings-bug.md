---
name: team-settings-bug
description: Team settings all disabled because memberRole missing from getTeamById response
metadata:
  type: project
---

**Bug:** Team settings (rename, add member, etc.) all disabled after team creation.

**Root cause:** `team.repo.ts` `findById` does NOT join `teamMembers`, so it never returns `memberRole`. Frontend's `isOwner = team.memberRole === 'owner'` is always false, disabling all controls.

**Fix (applied 2026-06-15):** In `apps/server/src/core/chat/team/team.service.ts` `getTeamById`:
- Capture the return value of `assertMember` (which returns `TeamMember` with `.role`)
- Merge into team response: `return { ...team, memberRole: member.role } as Team`

**Why:** Two-line fix avoids changing the repo's `findById` signature while correctly returning the current user's role.
**How to apply:** If memberRole is ever missing from team API responses, check this pattern.
