# SPMMS – Approval Workflow and UI Improvements (Fit Existing Database)

## Goal

Implement the approval performance, Deputy Chief Secretary routing, and approval document display improvements in this repository while preserving the existing application and its data.

Work from the checked-out `feat/minutes_creation` branch unless the repository state requires a feature branch. Inspect the current code before changing it. Do not replace the approval system or redesign unrelated workflows.

## Existing project and database context

The repository contains a React/TypeScript/Vite/Tailwind frontend and a Laravel API. Follow the actual installed versions and local conventions; do not assume the production database driver matches the local default.

The current migrations and `mmcs_db.sql` show these relevant structures:

- `approvable_documents` is the approval record. It stores `document_id`, `reference_id`, `document_type`, `source_id`, `subject`, `description`, `full_content`, `status`, `submitted_by`, and `current_step_order`.
- `approval_workflow_steps` stores the ordered approval stages with `step_label`, `step_order`, `required_role`, `status`, `actioned_by`, and `actioned_at`. The standard order is Officer → Department Head → Deputy → Chief Secretary. Role keys include `officer`, `dept_head`, `deputy`, and `chief_secretary`.
- `actioned_by` is the user who completed a step. It is not an assignment field. The existing step table does not contain an individual assigned-approver column.
- `approval_comments` stores comments and their authors.
- `users` stores `user_id`, `full_name`, `designation`, `role_id`, `organization_id`, and `status` (`ACTIVE`/`INACTIVE`). Role names are stored in `roles.role_name`.
- Letters and minutes are stored in `letters` and `meeting_minutes`, linked to approvals through `approvable_documents.document_type` and `source_id`. The approval record already stores rendered/snapshot content in `full_content`.
- `notifications` and `NotificationService` already exist. Inspect their behavior and production configuration before changing dispatch.
- Local development defaults to SQLite; the repository also includes a MySQL schema/data dump. Treat migrations as the source of schema evolution and inspect the configured target driver before relying on driver-specific behavior.

These notes are a starting point, not permission to assume every production database is identical. Verify the live code, migrations, and relevant schema before implementation. Never expose credentials or dump production data.

## Scope

### 1. Improve approval submission and loading

Trace the existing letter and minutes flows end to end, including:

- `frontend/src/pages/GenerateLetterPage.tsx` and `CreateMinutesPage.tsx`;
- the frontend letter, minute, and approval services;
- `ApprovalsPage.tsx` and its preview components;
- `ApprovalController`, `LetterController`, `MinuteController`, `NotificationService`, and related models;
- actual approval queries, database indexes, and routes.

Identify and measure the slow requests and avoidable work before optimizing. Do not assume the frontend, a specific query, or notifications are the cause. Use local instrumentation and available request/query timing. If production measurements or browser Network data are unavailable, state that limitation and report only measurements actually collected.

Reduce duplicate saves, repeated rendering/generation, unnecessary detail fetches, and redundant response payloads where the current architecture allows it. Preserve existing IDs, source records, resubmission behavior, document types, and approval history. Make submission resistant to accidental repeated clicks and duplicate workflow creation; keep the button disabled while the request is in flight and provide clear success/error feedback.

Keep the existing `/api/approvals` API architecture unless a demonstrated need requires a compatible extension. Paginate lists, limit list responses to fields the list uses, eager-load only relationships needed by each view, and keep detail data on the detail request. Retain all existing authorization and filtering requirements. Add an index only when the measured query and current schema justify it.

Inspect whether notifications are database records, queued jobs, external mail, or a combination. Queue work only if the target environment has a functioning worker and the behavior is safe after transaction commit. Do not introduce duplicate notifications or make approval persistence depend on an external service responding. Document any required queue setup and fallback.

### 2. Let the Department Head route a letter or minute to one deputy

For letters and meeting minutes, enable this flow:

**Officer → Department Head → selected Deputy (`deputy`) → Chief Secretary**

The Department Head selects one eligible, active user whose actual role is `deputy` while taking the existing Department Head approval/forwarding action. The chosen person receives the pending task. Other deputy-role users must not see it as their assigned pending task. After the selected deputy approves, continue to the existing Chief Secretary stage. Do not change routing for unrelated document types.

Inspect and reuse the existing role and user lookup mechanisms. Do not hardcode people, IDs, role IDs, or department assignments. Return only the fields required by the selector (for example `user_id`, `full_name`, and relevant organization/designation data), and require authentication. Apply organization constraints only if existing business rules and code establish that they apply.

The Department Head selector must load from the backend, show loading and error states, require a selection, support keyboard/accessibility basics, prevent repeated submission, and preserve the selected document if forwarding fails. Refresh the relevant approval data after success.

#### Persisting and authorizing the selected deputy

First determine whether existing data or relationships can safely represent an individual assignment. Do not misuse `actioned_by`, `required_role`, comments, or frontend state as the assignment.

If the existing schema has no suitable persisted assignment mechanism, add only the smallest backward-compatible schema change needed to associate the step 3 `approval_workflow_steps` row with a selected `users.user_id` (for example, a nullable assigned-user foreign key with an index). Use the actual key types and naming conventions. Make it additive and safe for existing rows; do not recreate tables, rewrite unrelated records, or add duplicate workflow entities. Existing step 3 rows without an individual assignment must continue to follow the documented legacy behavior until a safe compatibility rule is implemented.

Extend the existing approval action or add a compatible action only if needed. In one transaction, lock/recheck the approval and current step, verify the caller is an authorized Department Head, verify the document is pending at the Department Head stage, validate that the selected user is active and has role `deputy`, record the Department Head action and selected assignment, advance the existing deputy step, update `current_step_order`, and preserve comments/history. Reject invalid or repeated transitions without partial writes. Send the action-required notification only to the selected deputy, plus any notifications the existing workflow contract already requires. Do not notify every deputy for an individually assigned task.

Enforce assignment in backend detail and pending-list authorization, not just UI filtering. Preserve the established access rules for administrators, submitters, and audit users. Verify that the selected deputy alone can act at step 3 and that the Chief Secretary can act at step 4.

### 3. Make approval previews consistent with existing previews

Inspect how generation previews work before creating new presentation code.

- Letter generation already has a preview path and stores rendered content in `approvable_documents.full_content`. Reuse that saved, authoritative content and the existing sanitization/preview conventions where appropriate. Do not regenerate a different letter just to display it in approvals.
- Minutes already have structured source data and an existing PDF preview/download path. Reuse the existing minute template/rendering path when it is the source of truth. Avoid generating a second competing template or expensive PDF on every list row.
- If a reusable preview component or renderer can be extracted cleanly, do so without breaking generation, printing, or downloads.

In the approval detail screen, show the official letter/minutes separately from workflow status, submitter, stage, comments, and history. Preserve Sinhala rendering, formatting, responsive behavior, and current print/PDF behavior. Handle missing optional minute fields and unavailable previews without inventing document content. Do not render arbitrary backend response objects or expose unrelated API fields.

### 4. API and UI contract

Use the current routes and response conventions wherever possible. Existing approval routes include list/detail, submit, approve, edit-and-forward, reject, and comments under `/api/approvals`. Add or modify only the routes needed for the requested selector/assignment, behind the existing Sanctum authentication and appropriate role checks.

Keep API access in the current frontend service layer and define/update TypeScript types to match the real response. Keep business authorization in Laravel. Return minimal list data and the additional structured detail data needed by the open document view. Preserve existing screens and behavior for other document types.

### 5. Verification and backward compatibility

Use the project's existing test and lint/build setup. Add focused tests for the affected behavior, including:

- Department Head routing for both letters and minutes;
- selected deputy sees and can act on the task; another deputy cannot act as the assignee;
- inactive/wrong-role users, wrong workflow stage, unauthorized callers, and duplicate submissions are rejected without partial updates;
- history, status, and notification recipient remain correct;
- existing generic approval, rejection, resubmission, Chief Secretary progression, letter generation, and minute preview/download still work;
- approval list/detail loading, preview errors, selector loading/errors, and in-flight submission behavior.

Run tests relevant to the changed code and report exact commands/results. Do not claim performance improvements without before/after timings from comparable requests. Do not claim production behavior was verified if only local data was used.

### 6. Production safety

Do not deploy, modify production environment variables, run destructive migrations, or overwrite server configuration. Keep any migration additive and reversible. Document deployment steps for running the migration and any queue-worker requirement, and give rollback instructions that do not delete application data. Include a checklist for comparing production and local PHP/runtime configuration, Laravel caches, database indexes, queue worker status, web-server behavior, and network latency.

## Completion report

At completion, summarize:

1. The verified performance bottlenecks and actual before/after measurements, or what could not be measured.
2. Files changed, grouped by frontend, backend, and migrations.
3. API routes changed or added.
4. How the selected deputy is persisted, authorized, and notified.
5. How existing letter/minute preview paths are reused.
6. Tests and build/lint commands run, with results.
7. Production migration/queue/deployment notes, rollback steps, and remaining limitations.

Do not claim deployment or production verification unless it was actually performed.
