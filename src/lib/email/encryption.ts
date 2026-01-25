import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    // Convert base64 key to buffer
    return Buffer.from(key, "base64");
}

/**
 * Encrypt a string value
 * @param text - Plain text to encrypt
 * @returns Encrypted value in format: iv:authTag:salt:encrypted
 */
export function encrypt(text: string): string {
    try {
        const key = getEncryptionKey();

        // Generate random IV and salt
        const iv = crypto.randomBytes(IV_LENGTH);
        const salt = crypto.randomBytes(SALT_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");

        // Get auth tag
        const authTag = cipher.getAuthTag();

        // Combine: iv:authTag:salt:encrypted
        return `${iv.toString("hex")}:${authTag.toString("hex")}:${salt.toString("hex")}:${encrypted}`;
    } catch (error) {
        console.error("Encryption error:", error);
        throw new Error("Failed to encrypt data");
    }
}

/**
 * Decrypt an encrypted string
 * @param encryptedData - Encrypted data in format: iv:authTag:salt:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
    try {
        const key = getEncryptionKey();

        // Split the encrypted data
        const parts = encryptedData.split(":");
        if (parts.length !== 4) {
            throw new Error("Invalid encrypted data format");
        }

        const iv = Buffer.from(parts[0], "hex");
        const authTag = Buffer.from(parts[1], "hex");
        const encrypted = parts[3];

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Failed to decrypt data");
    }
}
