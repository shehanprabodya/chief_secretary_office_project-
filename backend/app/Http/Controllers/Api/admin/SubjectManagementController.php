<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\Meeting;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubjectManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('search', ''));

        $subjects = Subject::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('code', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('code')
            ->paginate($request->integer('per_page', 10));

        return response()->json($subjects);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:subjects,code'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $subject = Subject::create([
            ...$data,
            'code' => strtoupper(trim($data['code'])),
            'title' => trim($data['title']),
        ]);

        return response()->json([
            'message' => 'Subject created successfully.',
            'subject' => $subject,
        ], 201);
    }

    public function update(Request $request, Subject $subject): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('subjects', 'code')->ignore($subject->id)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $newCode = strtoupper(trim($data['code']));
        if ($newCode !== $subject->code && Meeting::where('meeting_code', $subject->code)->exists()) {
            return response()->json([
                'message' => 'The subject code cannot be changed because it is used by existing meetings.',
            ], 409);
        }

        $subject->update([
            ...$data,
            'code' => $newCode,
            'title' => trim($data['title']),
        ]);

        return response()->json([
            'message' => 'Subject updated successfully.',
            'subject' => $subject->fresh(),
        ]);
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $isUsed = Meeting::where('meeting_code', $subject->code)->exists()
            || Letter::where('subject_id', $subject->id)->exists();

        if ($isUsed) {
            return response()->json([
                'message' => 'This subject cannot be deleted because it is used by a meeting or letter.',
            ], 409);
        }

        $subject->delete();

        return response()->json(['message' => 'Subject deleted successfully.']);
    }
}
