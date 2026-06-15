# Likh vs Mattermost feature gap audit

Date: 2026-06-15

This audit compares the current Likh codebase against Mattermost capabilities visible in the local `mattermost` repo plus current Mattermost product documentation. Teable and Colanode were used as local references for project-management shape: structured records, multiple views, custom fields, and team/workspace collaboration.

## Recently added in Likh

- Team-linked projects under chat team settings.
- Task records with status, priority, assignee, due date, and default project view.
- Table, board, and calendar-style task scanning.
- Team-member access checks for project/task APIs.

## Matched or partially matched

| Mattermost area | Likh status |
| --- | --- |
| Teams and team membership | Matched at a basic level: teams, owners/members, open/invite-only teams. |
| Channels | Partially matched: team channels, public/private channel types, channel membership. |
| Direct messages | Partially matched: DM and group DM channel types exist. |
| Messages | Partially matched: send/edit/delete, threads through `rootId`, reactions, mentions, attachments. |
| File sharing | Partially matched: chat attachments reuse Likh attachments. |
| Calls | Partially matched: call tables/modules exist, but full production call deployment parity is not confirmed. |
| Project management / boards | Newly partial: team projects and tasks now exist with table/board/calendar views, but not full Mattermost Boards parity. |
| Webhooks and integrations | Partially matched: generic webhooks and integration settings exist. |
| Workspace identity | Partially matched: users, groups, SSO/OIDC/LDAP/SCIM pieces exist in Likh. |
| Audit and compliance foundations | Partially matched: audit logs and retention-relevant entities exist, but not full Mattermost compliance coverage. |
| Search | Partially matched: Likh has page/search infrastructure and chat message persistence, but Mattermost-grade message/file search parity is not complete. |
| Mobile/web clients | Partially matched: Likh has web UI; Mattermost has mature web, desktop, and mobile clients. |

## Missing or not yet complete

- Boards parity:
  - Multiple saved views per project.
  - Custom card properties/fields beyond fixed status, priority, assignee, due date.
  - Gallery view.
  - Filters, grouping, sorting, calculations, templates, card comments, card links/previews, board sharing, import/export, sidebar categories.
  - Channel-linked boards with automatic channel-member access.
- Playbooks/workflow automation:
  - Playbook templates, runs, checklists, status updates, retrospectives, metrics, run automation, and incident-style orchestration.
- Mattermost-grade chat:
  - Advanced thread inbox/following behavior.
  - Rich post actions, saved posts, pinned posts, scheduled posts, reminders, slash command ecosystem, bots, custom emoji workflows, and advanced notification preferences.
- Administration:
  - System console parity, granular permissions/schemes, policy controls, compliance export, eDiscovery-style exports, data retention policies, content flagging, and enterprise audit coverage.
- Integrations:
  - Marketplace/plugin framework parity.
  - First-party integrations such as GitHub, GitLab, Jira, ServiceNow, Splunk, Zoom/Pexip, and DevOps/ITSM workflows.
- Calls:
  - Full Mattermost Calls parity: deployment modes, RTCD scaling, call recordings/transcriptions, screen-share controls, and operational admin settings.
- Security and trust:
  - Enterprise-grade high availability, cluster operations, remote clusters, shared channels/federation, data residency/sovereign deployment controls, and detailed compliance certifications.
- AI platform:
  - Mattermost-style AI agents, multi-agent/multi-LLM integrations, and channel/workflow-aware AI operations.
- Clients and UX:
  - Dedicated desktop/mobile app parity, offline behavior, push notification depth, keyboard shortcut breadth, accessibility parity, and mature onboarding/product tours.

## References checked

- Mattermost product overview: https://docs.mattermost.com/product-overview/product-overview-index.html
- Mattermost Channels: https://mattermost.com/channels/
- Mattermost Boards overview: https://docs.mattermost.com/end-user-guide/project-task-management.html
- Mattermost Boards views/cards: https://docs.mattermost.com/end-user-guide/project-management/work-with-boards.html
- Mattermost Playbooks: https://docs.mattermost.com/end-user-guide/workflow-automation.html
- Mattermost integrations: https://docs.mattermost.com/integrations-guide/popular-integrations.html
- Mattermost Calls deployment: https://docs.mattermost.com/administration-guide/configure/calls-deployment-guide.html
