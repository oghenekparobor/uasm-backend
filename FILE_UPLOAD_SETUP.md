# File Upload Setup Guide

## Overview

File upload functionality has been implemented using Cloudinary for cloud storage and Multer for handling multipart/form-data uploads.

## Environment Variables

Add these Cloudinary configuration variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Getting Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## Features Implemented

### ✅ File Upload Endpoint
- **POST** `/logs/:id/attachments` - Upload file attachment to member log
- Uses multipart/form-data with `file` field
- Files uploaded directly to Cloudinary

### ✅ File Storage
- Cloudinary cloud storage (no local disk storage)
- Files organized in folders: `uams/member-logs/{logId}/`
- Automatic CDN delivery

### ✅ File Validation
- **Size**: Maximum 10MB (configurable)
- **Types**: 
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF
- Validation happens at both Multer and application level

### ✅ File Serving
- **GET** `/files/:publicId` - Get file URL with optional transformations
- Query parameters:
  - `width` - Resize width
  - `height` - Resize height
  - `format` - Convert format (jpg, png, webp)
  - `quality` - Quality setting
- Files served directly from Cloudinary CDN

## Implementation Details

### Modules Created

1. **UploadModule** (`src/modules/upload/`)
   - `upload.service.ts` - Cloudinary integration
   - `upload.controller.ts` - File URL transformation endpoint
   - `file-upload.interceptor.ts` - Multer interceptor with validation
   - `upload.module.ts` - Module configuration

2. **Updated MemberLogsModule**
   - Added `addAttachmentFromUpload()` method
   - Updated `removeAttachment()` to delete from Cloudinary
   - Integrated file upload endpoint

### File Upload Flow

1. Client sends multipart/form-data POST request
2. `FileUploadInterceptor` validates file (size, type)
3. Multer processes file into memory buffer
4. `UploadService` uploads buffer to Cloudinary
5. Cloudinary returns secure URL and public ID
6. Attachment record created in database with Cloudinary URL

### File Delete Flow

1. Attachment record deleted from database
2. File deleted from Cloudinary using extracted public ID

## Usage Examples

### Upload File (cURL)

```bash
curl -X POST \
  http://localhost:3000/logs/{logId}/attachments \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/image.jpg"
```

### Upload File (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/logs/{logId}/attachments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const attachment = await response.json();
console.log('File URL:', attachment.fileUrl);
```

### Get Transformed Image URL

```javascript
const publicId = 'uams/member-logs/log-id/image';
const url = `/files/${publicId}?width=800&height=600&format=webp&quality=80`;
```

## Security

- ✅ All upload endpoints require JWT authentication
- ✅ RLS ensures users can only upload to logs they created
- ✅ File type validation prevents malicious uploads
- ✅ File size limits prevent DoS attacks
- ✅ Files stored securely in Cloudinary with CDN

## Error Handling

- `400 Bad Request`: File validation failed (size, type, missing file)
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: RLS denied access (user doesn't own the log)
- `404 Not Found`: Log or attachment not found
- `500 Internal Server Error`: Upload or Cloudinary API error

## Testing

### Postman Collection

The Postman collection has been updated with:
- **Add Attachment (Upload File)** - Multipart form-data upload
- **Add Attachment (Manual URL)** - Original JSON endpoint (still supported)
- **Get File URL** - File transformation endpoint

### Test File Upload

1. Get authentication token
2. Create a member log
3. Use "Add Attachment (Upload File)" endpoint
4. Select a file (image or PDF)
5. Verify response contains Cloudinary URL

## Next Steps

1. Add Cloudinary credentials to `.env`
2. Test file upload endpoint
3. Verify files appear in Cloudinary dashboard
4. Test file deletion removes files from Cloudinary
5. Test file transformation endpoint

## Notes

- Files are stored in memory during upload (no local disk storage)
- Cloudinary URLs are HTTPS and CDN-delivered
- Public IDs are used for file management and transformations
- Old manual URL endpoint still works for backward compatibility

