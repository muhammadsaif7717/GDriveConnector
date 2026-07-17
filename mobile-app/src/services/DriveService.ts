import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  modifiedTime: string;
}

export interface StorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Helper function to handle Google API requests with proper headers.
 */
async function driveRequest(endpoint: string, accessToken: string, method: string = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Drive API request failed');
  }
  
  return data;
}

/**
 * Fetch files from the root directory.
 */
export async function fetchFiles(accessToken: string): Promise<DriveFile[]> {
  const query = encodeURIComponent("trashed = false and 'root' in parents");
  const fields = encodeURIComponent("files(id, name, mimeType, size, thumbnailLink, modifiedTime)");
  
  const data = await driveRequest(
    `/files?q=${query}&fields=${fields}&orderBy=folder,modifiedTime desc`, 
    accessToken
  );
  
  return data.files || [];
}

/**
 * Fetch storage quota for the authenticated user.
 */
export async function fetchStorageQuota(accessToken: string): Promise<StorageQuota> {
  const data = await driveRequest('/about?fields=storageQuota', accessToken);
  return {
    limit: parseInt(data.storageQuota.limit || '0', 10),
    usage: parseInt(data.storageQuota.usage || '0', 10),
    usageInDrive: parseInt(data.storageQuota.usageInDrive || '0', 10),
    usageInDriveTrash: parseInt(data.storageQuota.usageInDriveTrash || '0', 10),
  };
}

/**
 * Move a file to trash.
 */
export async function trashFile(fileId: string, accessToken: string): Promise<void> {
  await driveRequest(`/files/${fileId}`, accessToken, 'PATCH', { trashed: true });
}

/**
 * Upload a file to Google Drive.
 */
export async function uploadFile(
  uri: string, 
  name: string, 
  mimeType: string, 
  accessToken: string
): Promise<void> {
  // Read file as base64
  const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  
  const metadata = {
    name,
    mimeType,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  
  // React Native FormData hack for base64 file upload (or using fetch directly)
  // For Expo, direct fetch with multipart/related is better but complex. 
  // We'll use simple multipart upload endpoint.
  
  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    fileContent +
    close_delim;

  const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload file');
  }
}

/**
 * Download a file from Google Drive and share it (save to device).
 */
export async function downloadFile(fileId: string, fileName: string, accessToken: string): Promise<void> {
  const downloadUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  const fileUri = `${Paths.document.uri}${fileName}`;
  
  const { uri } = await FileSystem.downloadAsync(downloadUrl, fileUri, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    }
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
