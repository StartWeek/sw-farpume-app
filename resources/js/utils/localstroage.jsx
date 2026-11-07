import { doEncrypt, doDecrypt } from "./encrypt";

/**
 * Simpan data terenkripsi ke localStorage
 */
export const setItem = (key, value) => {
    try {
        const encryptedKey = doEncrypt(key); // encrypt key
        const encryptedValue = doEncrypt(JSON.stringify(value)); // encrypt data

        localStorage.setItem(encryptedKey, encryptedValue);
    } catch (err) {
        console.error("Error while setting encrypted item:", err);
    }
};

/**
 * Ambil data terenkripsi dari localStorage
 */
export const getItem = (key) => {
    try {
        const encryptedKey = doEncrypt(key);

        const stored = localStorage.getItem(encryptedKey);
        if (!stored) return null;

        // decrypt -> hasil masih string JSON
        const decrypted = doDecrypt(stored);

        // parse JSON ke object normal
        return JSON.parse(decrypted);
    } catch (err) {
        console.error("Error while getting encrypted item:", err);
        return null;
    }
};

/**
 * Hapus data terenkripsi
 */
export const removeItem = (key) => {
    try {
        const encryptedKey = doEncrypt(key);
        localStorage.removeItem(encryptedKey);
    } catch (err) {
        console.error("Error while removing encrypted item:", err);
    }
};
