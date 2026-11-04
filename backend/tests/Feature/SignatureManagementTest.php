<?php

namespace Tests\Feature;

use App\Models\ApprovableDocument;
use App\Models\ApprovalWorkflowStep;
use App\Models\Letter;
use App\Models\Meeting;
use App\Models\MeetingMinute;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SignatureManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_valid_signature_and_store_encrypted_payload(): void
    {
        $admin = $this->makeUser('admin');
        $chief = $this->makeUser('chief_secretary');

        Storage::fake('local');
        $file = UploadedFile::fake()->image('signature.png', 200, 80);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/signatures', [
            'user_id' => $chief->user_id,
            'signature' => $file,
            'is_active' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('user_signatures', [
            'user_id' => $chief->user_id,
            'is_active' => true,
            'mime_type' => 'image/png',
        ]);

        $record = \App\Models\UserSignature::query()->where('user_id', $chief->user_id)->firstOrFail();
        $this->assertNotSame('', $record->encrypted_file_path);
        $this->assertStringNotContainsString('signature.png', $record->encrypted_file_path);
        $this->assertFileExists(storage_path('app/' . $record->encrypted_file_path));
        $this->assertNotStringContainsString('public/', $record->encrypted_file_path);
    }

    public function test_admin_cannot_upload_signature_for_non_signatory_roles(): void
    {
        $admin = $this->makeUser('admin');
        $officer = $this->makeUser('officer');

        Storage::fake('local');
        $file = UploadedFile::fake()->image('signature.png', 200, 80);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/signatures', [
            'user_id' => $officer->user_id,
            'signature' => $file,
            'is_active' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Only the Chief Secretary and Deputy Chief Secretary may have official signatures uploaded.');
        $this->assertDatabaseMissing('user_signatures', [
            'user_id' => $officer->user_id,
        ]);
    }

    public function test_admin_can_list_uploaded_signatures_and_delete_a_record(): void
    {
        $admin = $this->makeUser('admin');
        $chief = $this->makeUser('chief_secretary');

        $this->uploadSignatureFor($chief);

        $listResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/signatures');
        $listResponse->assertOk()
            ->assertJsonFragment(['user_name' => $chief->full_name]);

        $signature = \App\Models\UserSignature::query()->where('user_id', $chief->user_id)->firstOrFail();
        $deleteResponse = $this->actingAs($admin, 'sanctum')->deleteJson('/api/admin/signatures/' . $signature->id);

        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('user_signatures', [
            'id' => $signature->id,
        ]);
    }

    public function test_chief_secretary_can_create_delegation_and_assigned_deputy_can_sign_with_own_signature(): void
    {
        $chief = $this->makeUser('chief_secretary');
        $deputy = $this->makeUser('deputy');

        $this->uploadSignatureFor($chief);
        $this->uploadSignatureFor($deputy);

        $delegationResponse = $this->actingAs($chief, 'sanctum')->postJson('/api/signing-delegations', [
            'delegated_signer_id' => $deputy->user_id,
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'reason' => 'Temporary delegation during leave',
        ]);

        $delegationResponse->assertCreated();

        \App\Models\Subject::query()->firstOrCreate([
            'code' => 'LET-1001',
            'title' => 'Test Letter',
        ]);

        $letter = Letter::create([
            'meeting_code' => 'LET-1001',
            'sender_name' => $chief->full_name,
            'title' => 'Test Letter',
            'content' => 'This is a test letter content.',
            'signatory_name' => 'Chief Secretary',
            'designation' => 'Chief Secretary',
            'signature_date' => now()->toDateString(),
            'status' => 'draft',
            'created_by' => $chief->user_id,
        ]);

        $this->makeDocumentAtDeputyStep('letter', (int) $letter->letter_id, $chief, $deputy);

        $response = $this->actingAs($deputy, 'sanctum')->postJson('/api/signing/documents/letter/' . $letter->letter_id . '/sign', [
            'confirm' => true,
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('document_signatures', [
            'document_type' => 'letter',
            'document_id' => $letter->letter_id,
            'signer_id' => $deputy->user_id,
            'primary_signer_id' => $chief->user_id,
            'signing_type' => 'DELEGATED',
        ]);
    }

    public function test_signing_route_accepts_approvable_document_id_and_maps_to_source_letter(): void
    {
        $chief = $this->makeUser('chief_secretary');
        $this->uploadSignatureFor($chief);

        \App\Models\Subject::query()->firstOrCreate([
            'code' => 'LET-2002',
            'title' => 'Approval Letter',
        ]);

        $letter = Letter::create([
            'meeting_code' => 'LET-2002',
            'sender_name' => $chief->full_name,
            'title' => 'Approval Letter',
            'content' => 'Approval letter content for delegated signing preview.',
            'signatory_name' => 'Chief Secretary',
            'designation' => 'Chief Secretary',
            'signature_date' => now()->toDateString(),
            'status' => 'draft',
            'created_by' => $chief->user_id,
        ]);

        $approvableDocument = $this->makeDocumentAtChiefStep('letter', (int) $letter->letter_id, $chief, $chief);

        $response = $this->actingAs($chief, 'sanctum')->postJson('/api/signing/documents/letter/' . $approvableDocument->document_id . '/sign', [
            'confirm' => true,
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('document_signatures', [
            'document_type' => 'letter',
            'document_id' => $letter->letter_id,
            'signer_id' => $chief->user_id,
            'primary_signer_id' => $chief->user_id,
        ]);
    }

    public function test_deputy_signing_with_active_delegation_auto_approves_letter_and_skips_chief_step(): void
    {
        $chief = $this->makeUser('chief_secretary');
        $deputy = $this->makeUser('deputy');
        $officer = $this->makeUser('officer');

        $this->uploadSignatureFor($deputy);

        $this->actingAs($chief, 'sanctum')->postJson('/api/signing-delegations', [
            'delegated_signer_id' => $deputy->user_id,
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'reason' => 'Delegated approval test',
        ])->assertCreated();

        $letter = $this->makeLetter($officer);
        $document = $this->makeDocumentAtDeputyStep('letter', (int) $letter->letter_id, $officer, $deputy);

        $response = $this->actingAs($deputy, 'sanctum')->postJson('/api/signing/documents/letter/' . $letter->letter_id . '/sign', [
            'confirm' => true,
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonPath('auto_approved', true);

        $this->assertDatabaseHas('approvable_documents', [
            'document_id' => $document->document_id,
            'status' => 'approved',
            'current_step_order' => 4,
        ]);
        $this->assertDatabaseHas('approval_workflow_steps', [
            'document_id' => $document->document_id,
            'step_order' => 4,
            'status' => 'not_required',
            'actioned_by' => $deputy->user_id,
        ]);
        $this->assertDatabaseHas('letters', [
            'letter_id' => $letter->letter_id,
            'status' => 'approved',
        ]);
        $this->assertDatabaseHas('document_signatures', [
            'document_type' => 'letter',
            'document_id' => $letter->letter_id,
            'signer_id' => $deputy->user_id,
            'signing_type' => 'DELEGATED',
        ]);

        $signature = \App\Models\DocumentSignature::query()
            ->where('document_type', 'letter')
            ->where('document_id', $letter->letter_id)
            ->where('signer_id', $deputy->user_id)
            ->latest('signed_at')
            ->firstOrFail();

        $this->assertNotNull($signature->signed_pdf_path);
        $this->assertNotNull($signature->signed_pdf_sha256);
    }

    public function test_deputy_cannot_sign_outside_assigned_deputy_approval_stage(): void
    {
        $deputy = $this->makeUser('deputy');
        $officer = $this->makeUser('officer');
        $this->uploadSignatureFor($deputy);

        $letter = $this->makeLetter($officer);

        $this->actingAs($deputy, 'sanctum')->postJson('/api/signing/documents/letter/' . $letter->letter_id . '/sign', [
            'confirm' => true,
            'password' => 'password',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Document signing failed.')
            ->assertJsonPath('errors.role.0', 'Deputy signing is allowed only at the assigned deputy approval stage.');
    }

    public function test_chief_must_sign_before_final_approval_for_letter_and_minute(): void
    {
        $chief = $this->makeUser('chief_secretary');
        $officer = $this->makeUser('officer');
        $this->uploadSignatureFor($chief);

        $letter = $this->makeLetter($officer);
        $letterDocument = $this->makeDocumentAtChiefStep('letter', (int) $letter->letter_id, $officer, $chief);

        $this->actingAs($chief, 'sanctum')->postJson('/api/approvals/' . $letterDocument->document_id . '/approve')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Please sign the document before approving it.');

        $this->actingAs($chief, 'sanctum')->postJson('/api/signing/documents/letter/' . $letter->letter_id . '/sign', [
            'confirm' => true,
            'password' => 'password',
        ])->assertOk();

        $this->actingAs($chief, 'sanctum')->postJson('/api/approvals/' . $letterDocument->document_id . '/approve')
            ->assertOk();

        $meeting = $this->makeMeeting($officer);
        $minute = $this->makeMinute($officer, $meeting);
        $minuteDocument = $this->makeDocumentAtChiefStep('minute', (int) $minute->minute_id, $officer, $chief);

        $this->actingAs($chief, 'sanctum')->postJson('/api/approvals/' . $minuteDocument->document_id . '/approve')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Please sign the document before approving it.');
    }

    private function makeDocumentAtDeputyStep(string $documentType, int $sourceId, User $submitter, User $assignedDeputy): ApprovableDocument
    {
        $document = ApprovableDocument::create([
            'reference_id' => strtoupper($documentType) . '-' . uniqid(),
            'document_type' => $documentType,
            'source_id' => $sourceId,
            'subject' => ucfirst($documentType) . ' delegated approval test',
            'submitted_by' => $submitter->user_id,
            'status' => 'pending',
            'current_step_order' => 2,
        ]);
        $document->initializeWorkflow();

        ApprovalWorkflowStep::query()
            ->where('document_id', $document->document_id)
            ->where('step_order', 1)
            ->update(['status' => 'approved', 'actioned_by' => $submitter->user_id, 'actioned_at' => now()]);

        ApprovalWorkflowStep::query()
            ->where('document_id', $document->document_id)
            ->where('step_order', 2)
            ->update(['status' => 'approved', 'actioned_by' => $submitter->user_id, 'actioned_at' => now()]);

        ApprovalWorkflowStep::query()
            ->where('document_id', $document->document_id)
            ->where('step_order', 3)
            ->update(['status' => 'pending', 'assigned_to' => $assignedDeputy->user_id]);

        $document->update(['current_step_order' => 3]);

        return $document->fresh();
    }

    private function makeDocumentAtChiefStep(string $documentType, int $sourceId, User $submitter, User $chief): ApprovableDocument
    {
        $document = ApprovableDocument::create([
            'reference_id' => strtoupper($documentType) . '-CHIEF-' . uniqid(),
            'document_type' => $documentType,
            'source_id' => $sourceId,
            'subject' => ucfirst($documentType) . ' chief approval test',
            'submitted_by' => $submitter->user_id,
            'status' => 'pending',
            'current_step_order' => 2,
        ]);
        $document->initializeWorkflow();

        ApprovalWorkflowStep::query()
            ->where('document_id', $document->document_id)
            ->whereIn('step_order', [1, 2, 3])
            ->update(['status' => 'approved', 'actioned_by' => $submitter->user_id, 'actioned_at' => now()]);

        ApprovalWorkflowStep::query()
            ->where('document_id', $document->document_id)
            ->where('step_order', 4)
            ->update(['status' => 'pending', 'assigned_to' => $chief->user_id]);

        $document->update(['current_step_order' => 4]);

        return $document->fresh();
    }

    private function makeLetter(User $creator): Letter
    {
        \App\Models\Subject::query()->firstOrCreate([
            'code' => 'LET-' . rand(1000, 9999),
            'title' => 'Signature Test Letter',
        ]);

        return Letter::create([
            'meeting_code' => \App\Models\Subject::query()->latest('created_at')->value('code'),
            'sender_name' => $creator->full_name,
            'title' => 'Signature Test Letter',
            'content' => 'This is a test letter content for delegated signing.',
            'signatory_name' => 'Chief Secretary',
            'designation' => 'Chief Secretary',
            'signature_date' => now()->toDateString(),
            'status' => 'draft',
            'created_by' => $creator->user_id,
        ]);
    }

    private function makeMeeting(User $creator): Meeting
    {
        $subjectCode = 'MTG-' . rand(1000, 9999);
        \App\Models\Subject::query()->firstOrCreate([
            'code' => $subjectCode,
            'title' => 'Minute Subject',
        ]);

        return Meeting::create([
            'meeting_code' => $subjectCode,
            'title' => 'Signature Test Meeting',
            'meeting_date' => now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'location' => 'Board Room',
            'location_type' => 'physical',
            'status' => 'completed',
            'description' => 'Meeting for minute signing test',
            'created_by' => $creator->user_id,
        ]);
    }

    private function makeMinute(User $creator, Meeting $meeting): MeetingMinute
    {
        return MeetingMinute::create([
            'meeting_id' => $meeting->meeting_id,
            'meeting_description' => 'Test meeting description',
            'discussion_summary' => 'Test discussion summary',
            'closing_remarks' => 'Test closing remarks',
            'signatory_name' => 'Chief Secretary',
            'signatory_designation' => 'Chief Secretary',
            'status' => 'draft',
            'created_by' => $creator->user_id,
        ]);
    }

    private function makeUser(string $roleName): User
    {
        $role = Role::firstOrCreate(['role_name' => $roleName]);
        $id = uniqid('user', true);

        return User::create([
            'full_name' => ucfirst(str_replace('_', ' ', $roleName)) . ' ' . $id,
            'email' => $id . '@example.test',
            'username' => $id,
            'password_hash' => bcrypt('password'),
            'role_id' => $role->role_id,
            'status' => 'ACTIVE',
        ]);
    }

    private function uploadSignatureFor(User $user): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->image('signature.png', 200, 80);

        $admin = User::query()->where('role_id', Role::where('role_name', 'admin')->value('role_id'))->first();
        if (!$admin) {
            $admin = $this->makeUser('admin');
        }

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/signatures', [
                'user_id' => $user->user_id,
                'signature' => $file,
                'is_active' => true,
            ])->assertCreated();
    }
}
