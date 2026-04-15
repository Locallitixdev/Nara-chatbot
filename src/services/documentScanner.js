import { invoke } from '@tauri-apps/api/core';

const FOLDER_CONFIG_KEY = 'nara_documents_folder';

/**
 * @returns {string|null}
 */
export function getConfiguredFolder() {
  return localStorage.getItem(FOLDER_CONFIG_KEY);
}

/**
 * @param {string} path
 */
export function setConfiguredFolder(path) {
  localStorage.setItem(FOLDER_CONFIG_KEY, path);
}

/**
 * @param {string} folderPath
 * @returns {Promise<Array<{name: string, path: string, is_dir: boolean, size: number, modified: number}>>}
 */
export async function scanFolder(folderPath) {
  try {
    const files = await invoke('list_directory', { path: folderPath });
    
    const documents = files
      .filter(f => !f.is_dir && isDocumentFile(f.name))
      .map(f => ({
        ...f,
        modified: f.modified * 1000,
      }));
    
    return documents;
  } catch (error) {
    console.error('Failed to scan folder:', error);
    throw error;
  }
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
export function isDocumentFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['txt', 'md', 'pdf', 'docx'].includes(ext);
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
export function isPdfFile(filename) {
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
export function isTextFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['txt', 'md', 'text'].includes(ext);
}

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function readFileContent(path) {
  try {
    return await invoke('read_file_content', { path });
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
}

/**
 * @param {string} path
 * @returns {Promise<Uint8Array>}
 */
export async function readFileBytes(path) {
  try {
    const bytes = await invoke('read_file_bytes', { path });
    return new Uint8Array(bytes);
  } catch (error) {
    console.error('Failed to read file bytes:', error);
    throw error;
  }
}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function fileExists(path) {
  try {
    return await invoke('file_exists', { path });
  } catch {
    return false;
  }
}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function isDirectory(path) {
  try {
    return await invoke('is_directory', { path });
  } catch {
    return false;
  }
}

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * @param {number} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
