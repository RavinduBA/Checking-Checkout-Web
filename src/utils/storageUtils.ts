import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a signed URL for viewing files from private storage buckets
 * @param filePath - The path to the file in storage (e.g., "reservation-documents/filename.jpg")
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - The signed URL or empty string if error
 */
export const getSignedImageUrl = async (
	filePath: string,
	expiresIn: number = 3600, // 1 hour default
): Promise<string> => {
	try {
		const { data, error } = await supabase.storage
			.from("reservation-documents")
			.createSignedUrl(filePath, expiresIn);

		if (error) {
			console.error("Error creating signed URL:", error);
			return "";
		}

		return data.signedUrl;
	} catch (error) {
		console.error("Error creating signed URL:", error);
		return "";
	}
};

/**
 * Extracts the file path from a full storage URL
 * @param url - Full storage URL
 * @returns The file path portion
 */
export const extractFilePathFromUrl = (url: string): string => {
	try {
		// Handle both public URLs and signed URLs
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split("/");
		
		// For public URLs: /storage/v1/object/public/reservation-documents/path/file.ext
		// For signed URLs: /storage/v1/object/sign/reservation-documents/path/file.ext
		const bucketIndex = pathParts.findIndex(part => part === "reservation-documents");
		
		if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
			// Return everything after the bucket name
			return pathParts.slice(bucketIndex + 1).join("/");
		}
		
		// Fallback: assume the URL already contains just the file path
		return url;
	} catch (error) {
		console.error("Error extracting file path:", error);
		return url;
	}
};

/**
 * Component hook for managing signed URLs with automatic refresh
 */
export const useSignedUrl = (filePath: string | null) => {
	const [signedUrl, setSignedUrl] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!filePath) {
			setSignedUrl("");
			return;
		}

		const generateUrl = async () => {
			setLoading(true);
			setError(null);
			
			try {
				const url = await getSignedImageUrl(filePath);
				if (url) {
					setSignedUrl(url);
				} else {
					setError("Failed to generate signed URL");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};

		generateUrl();
	}, [filePath]);

	return { signedUrl, loading, error };
};