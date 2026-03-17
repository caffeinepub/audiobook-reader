// Stub for blob storage integration
// In production this connects to the blob-storage canister
export default function useBlobStorage() {
  const uploadFile = async (file: File): Promise<string> => {
    // Return the file name as a placeholder path
    // Full blob storage integration would upload to IC canister
    return file.name;
  };

  return { uploadFile };
}
