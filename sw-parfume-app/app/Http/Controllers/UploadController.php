<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;
use App\Services\AuditService;

class UploadController extends Controller
{
    public function image(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|file|mimes:jpg,jpeg,png,gif,webp|max:2048', // 2MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first('image'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $file = $request->file('image');
        $filename = Str::random(32) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads/images', $filename, 'public');

        // Audit log
        AuditService::log('upload_image', [
            'filename' => $filename,
            'original' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime' => $file->getMimeType(),
        ]);

        return response()->json([
            'path' => Storage::url($path),
        ]);
    }
}
