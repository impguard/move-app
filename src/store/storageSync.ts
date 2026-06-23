import { ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';

export async function uploadImageToStorage(uri: string): Promise<string> {
  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = extension.length > 4 ? 'jpg' : extension;
  const fileName = `${uuidv4()}.${safeExt}`;
  const fileRef = ref(storage, `images/${fileName}`);

  if (uri.startsWith('data:')) {
    const snapshot = await uploadString(fileRef, uri, 'data_url');
    return await getDownloadURL(snapshot.ref);
  }

  let blob: Blob;
  try {
    const response = await fetch(uri);
    blob = await response.blob();
  } catch (e) {
    console.warn('Fetch error reading blob', e);
    throw new TypeError('Failed to read file as blob');
  }

  // Upload the blob if it's not a data URL
  const snapshot = await uploadBytesResumable(fileRef, blob);
  
  // Get the public download URL
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
