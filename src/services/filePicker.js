import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Cross-platform file picker.
 *
 * Expo DocumentPicker on web can return a Blob/File depending on browser and
 * Expo version. Keeping the native File object avoids reconstructing a Blob
 * from a blob URL and fixes multipart uploads that otherwise arrive without a
 * `file` part at FastAPI.
 */
export async function pickFile({ accept = '*/*', multiple = false } = {}) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      input.accept = accept;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = () => {
        const files = Array.from(input.files || []);
        const mapped = files.map((file) => ({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          type: file.type || 'application/octet-stream',
          file,
          uri: URL.createObjectURL(file),
        }));
        input.remove();
        resolve(multiple ? mapped : mapped[0] || null);
      };
      input.click();
    });
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: accept,
    copyToCacheDirectory: true,
    multiple,
  });
  if (result.canceled) return multiple ? [] : null;
  const assets = result.assets || [];
  return multiple ? assets : assets[0] || null;
}
