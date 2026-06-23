import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';

export async function uploadImageToStorage(uri: string): Promise<string> {
  const isWeb = Platform.OS === 'web';
  let blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.warn('XHR error reading blob', e);
      reject(new TypeError('Failed to read file as blob'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

  // Create a unique file name
  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  // Check if extension is too long (e.g., if there's query params)
  const safeExt = extension.length > 4 ? 'jpg' : extension;
  const fileName = `${uuidv4()}.${safeExt}`;
  
  const fileRef = ref(storage, `images/${fileName}`);
  
  // Upload the blob
  const snapshot = await uploadBytesResumable(fileRef, blob);
  
  // Get the public download URL
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
