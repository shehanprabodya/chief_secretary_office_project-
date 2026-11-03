<?php

namespace Tests\Feature;

use App\Models\ApprovableDocument;
use App\Models\ApprovalWorkflowStep;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalDeputyRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_department_head_can_assign_a_letter_to_one_active_deputy(): void
    {
        $departmentHead = $this->makeUser('dept_head');
        $officer = $this->makeUser('officer');
        $selectedDeputy = $this->makeUser('deputy');
        $otherDeputy = $this->makeUser('deputy');
        $document = $this->makePendingDocument('letter', $officer);

        $this->actingAs($departmentHead)->postJson("/api/approvals/{$document->document_id}/approve", [
            'selected_deputy_id' => $selectedDeputy->user_id,
        ])->assertOk()->assertJsonPath('document.current_step_order', 3);

        $this->assertDatabaseHas('approval_workflow_steps', [
            'document_id' => $document->document_id,
            'step_order' => 3,
            'status' => 'pending',
            'assigned_to' => $selectedDeputy->user_id,
        ]);
        $this->assertDatabaseHas('notifications', ['user_id' => $selectedDeputy->user_id, 'entity_id' => $document->document_id]);
        $this->assertDatabaseMissing('notifications', ['user_id' => $otherDeputy->user_id, 'entity_id' => $document->document_id]);

        $this->actingAs($selectedDeputy)->getJson('/api/approvals')->assertOk()->assertJsonCount(1, 'documents');
        $this->actingAs($otherDeputy)->getJson('/api/approvals')->assertOk()->assertJsonCount(0, 'documents');
        $this->actingAs($otherDeputy)->getJson("/api/approvals/{$document->document_id}")->assertForbidden();
        $this->actingAs($otherDeputy)->postJson("/api/approvals/{$document->document_id}/approve")->assertForbidden();
    }

    public function test_department_head_can_assign_minutes_and_assigned_deputy_advances_to_chief_secretary(): void
    {
        $departmentHead = $this->makeUser('dept_head');
        $officer = $this->makeUser('officer');
        $selectedDeputy = $this->makeUser('deputy');
        $document = $this->makePendingDocument('minute', $officer);

        $this->actingAs($departmentHead)->postJson("/api/approvals/{$document->document_id}/approve", [
            'selected_deputy_id' => $selectedDeputy->user_id,
        ])->assertOk();

        $this->actingAs($selectedDeputy)->postJson("/api/approvals/{$document->document_id}/approve")
            ->assertOk()
            ->assertJsonPath('document.current_step_order', 4);

        $this->assertDatabaseHas('approval_workflow_steps', [
            'document_id' => $document->document_id,
            'step_order' => 3,
            'status' => 'approved',
            'actioned_by' => $selectedDeputy->user_id,
            'assigned_to' => $selectedDeputy->user_id,
        ]);
        $this->assertDatabaseHas('approval_workflow_steps', [
            'document_id' => $document->document_id,
            'step_order' => 4,
            'status' => 'pending',
        ]);
    }

    public function test_department_head_cannot_assign_inactive_or_wrong_role_user(): void
    {
        $departmentHead = $this->makeUser('dept_head');
        $officer = $this->makeUser('officer');
        $wrongRole = $this->makeUser('chief_secretary');
        $document = $this->makePendingDocument('letter', $officer);

        $this->actingAs($departmentHead)->postJson("/api/approvals/{$document->document_id}/approve", [
            'selected_deputy_id' => $wrongRole->user_id,
        ])->assertStatus(422);

        $inactiveDeputy = $this->makeUser('deputy');
        $inactiveDeputy->update(['status' => 'INACTIVE']);
        $this->actingAs($departmentHead)->postJson("/api/approvals/{$document->document_id}/approve", [
            'selected_deputy_id' => $inactiveDeputy->user_id,
        ])->assertStatus(422);

        $this->assertDatabaseHas('approvable_documents', [
            'document_id' => $document->document_id,
            'current_step_order' => 2,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('approval_workflow_steps', [
            'document_id' => $document->document_id,
            'step_order' => 2,
            'status' => 'pending',
        ]);
    }

    public function test_deputy_lookup_returns_only_active_deputy_role_users(): void
    {
        $departmentHead = $this->makeUser('dept_head');
        $activeDeputy = $this->makeUser('deputy');
        $inactiveDeputy = $this->makeUser('deputy');
        $inactiveDeputy->update(['status' => 'INACTIVE']);
        $this->makeUser('chief_secretary');

        $response = $this->actingAs($departmentHead)->getJson('/api/approvals/eligible-deputies')->assertOk();

        $ids = collect($response->json('deputies'))->pluck('user_id')->map(fn ($id) => (int) $id);
        $this->assertTrue($ids->contains((int) $activeDeputy->user_id));
        $this->assertFalse($ids->contains((int) $inactiveDeputy->user_id));
    }

    private function makePendingDocument(string $type, User $submitter): ApprovableDocument
    {
        $document = ApprovableDocument::create([
            'reference_id' => strtoupper($type) . '-' . uniqid(),
            'document_type' => $type,
            'subject' => 'Approval routing test',
            'submitted_by' => $submitter->user_id,
            'status' => 'pending',
            'current_step_order' => 2,
        ]);
        $document->initializeWorkflow();

        return $document;
    }

    private function makeUser(string $roleName): User
    {
        $role = Role::firstOrCreate(['role_name' => $roleName]);
        $id = uniqid();

        return User::create([
            'full_name' => ucfirst(str_replace('_', ' ', $roleName)) . ' ' . $id,
            'email' => $id . '@example.test',
            'username' => $id,
            'password_hash' => bcrypt('password'),
            'role_id' => $role->role_id,
            'status' => 'ACTIVE',
        ]);
    }
}
