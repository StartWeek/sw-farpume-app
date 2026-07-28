<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class UploadController extends Controller
{
    /**
     * Processing presets for different image types.
     */
    private const PROCESSING_PRESETS = [
        'sidebar_logo' => [
            'max_width' => 512,
            'max_height' => 512,
            'webp_quality' => 85,
            'keep_svg' => true,
        ],
        'login_logo' => [
            'max_width' => 1024,
            'max_height' => 512,
            'webp_quality' => 85,
            'keep_svg' => true,
        ],
        'default' => [
            'max_width' => 2048,
            'max_height' => 2048,
            'webp_quality' => 82,
            'keep_svg' => true,
        ],
    ];

    /**
     * Upload and process an image.
     *
     * Accepts multipart form-data with:
     *   - image (required): the image file
     *   - old_path (optional): previous file path to delete on replace
     *   - type (optional): processing preset — "sidebar_logo", "login_logo", or "default"
     *
     * Returns JSON: { "path": "/storage/uploads/images/xxx.webp" }
     */
    public function image(Request $request)
    {
        $validator = Validator::make(
            $request->all(),
            [
                'image' => 'required|file|mimes:jpg,jpeg,png,gif,webp,svg|max:2048',
                'type' => ['nullable', 'string', 'in:sidebar_logo,login_logo,default'],
            ],
            [
                'image.required' => 'Silakan pilih gambar yang akan diunggah.',
                'image.file' => 'File yang dipilih tidak valid.',
                'image.mimes' => 'Format gambar harus JPG, JPEG, PNG, GIF, WEBP, atau SVG.',
                'image.max' => 'Ukuran gambar maksimal 2MB.',
            ],
        );

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first('image'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $file = $request->file('image');
        $type = $request->input('type', 'default');
        $preset = self::PROCESSING_PRESETS[$type] ?? self::PROCESSING_PRESETS['default'];
        $extension = strtolower($file->getClientOriginalExtension());

        // Determine output extension — SVG stays SVG, raster becomes WebP
        $outputExtension = ($extension === 'svg') ? 'svg' : 'webp';
        $filename = Str::random(32).'.'.$outputExtension;
        $relativeDir = 'uploads/images';
        $storagePath = $relativeDir.'/'.$filename;

        if ($extension === 'svg') {
            // SVG: store as-is (vector, resolution-independent)
            $file->storeAs($relativeDir, $filename, 'public');
        } else {
            // Raster: process via GD → resize + convert to WebP
            $this->processAndStoreRaster($file->getRealPath(), $preset, $storagePath);
        }

        // Delete old file if provided
        $oldPath = $request->input('old_path');
        if ($oldPath && is_string($oldPath) && $oldPath !== '') {
            $this->deleteOldFile($oldPath);
        }

        // Audit log
        AuditService::log('upload_image', [
            'filename' => $filename,
            'original' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime' => $file->getMimeType(),
            'type' => $type,
            'output_format' => $outputExtension,
        ]);

        return response()->json([
            'path' => '/storage/'.$storagePath,
        ]);
    }

    /**
     * Process a raster image: resize to fit within max dimensions while
     * preserving aspect ratio, then save as WebP to the public disk.
     */
    private function processAndStoreRaster(string $sourcePath, array $preset, string $storagePath): void
    {
        [$srcWidth, $srcHeight] = getimagesize($sourcePath);
        $mime = mime_content_type($sourcePath);

        // Create source image from whatever format was uploaded
        $srcImage = match ($mime) {
            'image/jpeg', 'image/jpg' => imagecreatefromjpeg($sourcePath),
            'image/png' => imagecreatefrompng($sourcePath),
            'image/gif' => imagecreatefromgif($sourcePath),
            'image/webp' => imagecreatefromwebp($sourcePath),
            default => imagecreatefromjpeg($sourcePath),
        };

        if (! $srcImage) {
            // Fallback: if GD can't read the image, store the original as-is
            Storage::disk('public')->put($storagePath, file_get_contents($sourcePath));

            return;
        }

        // Handle transparency for PNG/GIF/WebP sources
        $this->preserveTransparency($srcImage, $mime);

        // Calculate new dimensions (fit within max, keep aspect ratio)
        $maxWidth = $preset['max_width'];
        $maxHeight = $preset['max_height'];
        $ratio = min($maxWidth / $srcWidth, $maxHeight / $srcHeight, 1.0);

        $newWidth = (int) round($srcWidth * $ratio);
        $newHeight = (int) round($srcHeight * $ratio);

        // Create the resized image
        $dstImage = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve transparency in the destination
        imagealphablending($dstImage, false);
        imagesavealpha($dstImage, true);

        imagecopyresampled(
            $dstImage, $srcImage,
            0, 0, 0, 0,
            $newWidth, $newHeight, $srcWidth, $srcHeight,
        );

        // Save as WebP to a temporary file, then store via Laravel's filesystem
        $tempPath = tempnam(sys_get_temp_dir(), 'img_').'.webp';
        imagewebp($dstImage, $tempPath, $preset['webp_quality']);

        Storage::disk('public')->put($storagePath, file_get_contents($tempPath));

        // Cleanup
        unlink($tempPath);
        imagedestroy($srcImage);
        imagedestroy($dstImage);
    }

    /**
     * Preserve transparency/alpha channel when converting from formats
     * that support it (PNG, WebP, GIF).
     */
    private function preserveTransparency(\GdImage $image, string $mime): void
    {
        if (in_array($mime, ['image/png', 'image/webp', 'image/gif'], true)) {
            imagealphablending($image, true);
            imagesavealpha($image, true);
        }
    }

    /**
     * Delete a previously uploaded file from the public disk.
     *
     * Handles both relative paths ("/storage/uploads/images/xxx.webp")
     * and absolute URLs ("http://.../storage/uploads/images/xxx.webp").
     */
    private function deleteOldFile(string $oldPath): void
    {
        // Extract the relative storage path from the old path
        $relativePath = $this->extractStoragePath($oldPath);

        if ($relativePath && Storage::disk('public')->exists($relativePath)) {
            Storage::disk('public')->delete($relativePath);
        }
    }

    /**
     * Extract the relative storage path from a full URL or absolute path.
     *
     * e.g. "http://127.0.0.1:8000/storage/uploads/images/xxx.svg" → "uploads/images/xxx.svg"
     * e.g. "/storage/uploads/images/xxx.svg" → "uploads/images/xxx.svg"
     */
    private function extractStoragePath(string $path): ?string
    {
        // Remove "/storage/" prefix (relative path from this app)
        if (str_starts_with($path, '/storage/')) {
            return substr($path, 9); // length of "/storage/"
        }

        // Remove full URL prefix (e.g. "http://127.0.0.1:8000/storage/...")
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            $parsed = parse_url($path);
            $urlPath = $parsed['path'] ?? '';
            if (str_starts_with($urlPath, '/storage/')) {
                return substr($urlPath, 9);
            }
        }

        return null;
    }
}
