<?php

namespace Tests\Feature;

use App\Models\Letter;
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

    public function test_chief_secretary_can_create_delegation_and_deputy_can_sign_with_own_signature(): void
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

        $approvableDocument = \App\Models\ApprovableDocument::query()->create([
            'reference_id' => 'SPC/DEV/2026/001',
            'document_type' => 'letter',
            'source_id' => $letter->letter_id,
            'subject' => 'Approval Letter',
            'description' => 'Needs official signature',
            'full_content' => '<p>Approval letter content for delegated signing preview.</p>',
            'status' => 'pending',
            'submitted_by' => $chief->user_id,
            'current_step_order' => 4,
        ]);

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
