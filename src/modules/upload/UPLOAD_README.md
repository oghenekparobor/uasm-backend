# File Upload Documentation

## Overview

File upload functionality using Cloudinary for storage and Multer for handling multipart/form-data.

## Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## File Upload Endpoints

### Upload Attachment to Member Log
**POST** `/logs/:id/attachments`

Upload a file attachment to a member log.

**Headers:**
- `Authorization: Bearer {access_token}`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: The file to upload (required)

**File Validation:**
- Max size: 10MB
- Allowed types:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
- `image/webp`
  - `application/pdf`

**Response:**
```json
{
  "id": "attachment-uuid",
  "memberLogId": "log-uuid",
  "fileUrl": "https://res.cloudinary.com/...",
  "fileType": "IMAGE",
  "fileSize": 1024000,
  "memberLog": {
    "id": "log-uuid",
    "memberId": "member-uuid"
  }
}
```

### Get File URL with Transformations
**GET** `/files/:publicId`

Get Cloudinary file URL with optional transformations.

**Headers:**
- `Authorization: Bearer {access_token}`

**Query Parameters:**
- `width` (optional): Resize width in pixels
- `height` (optional): Resize height in pixels
- `format` (optional): Convert format (e.g., `jpg`, `png`, `webp`)
- `quality` (optional): Quality setting (e.g., `auto`, `80`)

**Example:**
```
GET /files/uams/member-logs/log-id/image?width=800&height=600&format=webp&quality=80
```

**Response:**
```json
{
  "url": "https://res.cloudinary.com/.../w_800,h_600,f_webp,q_80/...",
  "publicId": "uams/member-logs/log-id/image",
  "transformations": {
    "width": 800,
    "height": 600,
    "format": "webp",
    "quality": "80"
  }
}
```

## File Storage

Files are stored in Cloudinary with the following folder structure:
- `uams/member-logs/{logId}/` - Member log attachments

## File Serving

Files are served directly from Cloudinary CDN URLs. The `fileUrl` returned from upload endpoints is a Cloudinary secure URL that can be used directly in the frontend.

## Implementation Details

### Upload Flow

1. Client sends multipart/form-data with file
2. Multer intercepts and validates file (size, type)
3. File buffer is uploaded to Cloudinary
4. Cloudinary returns secure URL and public ID
5. Attachment record created in database with Cloudinary URL

### Delete Flow

1. Attachment record deleted from database
2. File deleted from Cloudinary using public ID

### File Validation

- **Size**: Maximum 10MB (configurable)
- **Type**: Only images (JPEG, PNG, GIF, WebP) and PDFs allowed
- **Storage**: Memory buffer (no local disk storage)

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
```

### Get Transformed Image URL

```javascript
const url = `/files/${publicId}?width=800&height=600&format=webp`;
```

## Security

- All upload endpoints require authentication
- RLS ensures users can only upload to logs they created
- File type validation prevents malicious uploads
- File size limits prevent DoS attacks
- Files stored securely in Cloudinary

## Error Handling

- `400 Bad Request`: File validation failed (size, type)
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: RLS denied access
- `404 Not Found`: Log or attachment not found
- `500 Internal Server Error`: Upload or Cloudinary error

