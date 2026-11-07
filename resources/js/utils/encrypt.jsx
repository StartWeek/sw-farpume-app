const encryptascii = (str) => {
    let key = "C466E468E6E0EAE862D0";
    let isencryt = "true";

    let dataKey = {};
    for (let i = 0; i < key.length; i++) {
        dataKey[i] = key.substr(`${i}`, 1);
    }

    let strEnc = "";
    let nkey = 0;
    let jml = str.length;

    for (let i = 0; i < parseInt(jml); i++) {
        strEnc =
            strEnc +
            hexEncode(str[i].charCodeAt(0) + dataKey[nkey].charCodeAt(0));

        if (nkey === Object.keys(dataKey).length - 1) {
            nkey = 0;
        }
        nkey = nkey + 1;
    }
    return isencryt === "true" ? strEnc.toUpperCase() : str;
};

function autoType(value) {
    // boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // number
    if (!isNaN(value) && value.trim() !== "") return Number(value);

    // default string
    return value;
}

const decryptascii = (str) => {
    let isencryt = "true";

    if (str !== null) {
        let key = "C466E468E6E0EAE862D0";
        let dataKey = {};
        for (let i = 0; i < key.length; i++) {
            dataKey[i] = key.substr(`${i}`, 1);
        }

        let strDec = "";
        let nkey = 0;
        let jml = str.length;
        let i = 0;
        while (i < parseInt(jml)) {
            strDec =
                strDec +
                chr(hexdec(str.substr(i, 2)) - dataKey[nkey].charCodeAt(0));
            if (nkey === Object.keys(dataKey).length - 1) {
                nkey = 0;
            }
            nkey = nkey + 1;
            i = i + 2;
        }
        return isencryt === "true" ? strDec : str;
    }
};

const hexEncode = (str) => {
    var result = "";
    result = str.toString(16);
    return result;
};

const hexdec = (hex) => {
    var str = "";
    str = parseInt(hex, 16);
    return str;
};
const chr = (asci) => {
    var str = "";
    str = String.fromCharCode(asci);
    return str;
};

export function doEncrypt(dataBeforeCopy, ignore = []) {
    if (dataBeforeCopy === null || dataBeforeCopy === undefined) {
        return dataBeforeCopy;
    }

    // PRIMITIVE: convert everything → string, encrypt
    if (["string", "number", "boolean"].includes(typeof dataBeforeCopy)) {
        const str = String(dataBeforeCopy);
        return encryptascii(str);
    }

    // ARRAY / OBJECT
    if (
        typeof dataBeforeCopy === "object" &&
        !(dataBeforeCopy instanceof Date)
    ) {
        const data = Array.isArray(dataBeforeCopy)
            ? [...dataBeforeCopy]
            : { ...dataBeforeCopy };

        Object.keys(data).forEach((key) => {
            if (ignore.includes(key)) return;

            const val = data[key];

            if (["string", "number", "boolean"].includes(typeof val)) {
                data[key] = encryptascii(String(val));
            } else if (Array.isArray(val) || typeof val === "object") {
                data[key] = doEncrypt(val, ignore);
            }
        });

        return data;
    }

    return dataBeforeCopy;
}

export function doDecrypt(dataBeforeCopy, ignore = []) {
    if (dataBeforeCopy === null || dataBeforeCopy === undefined) {
        return dataBeforeCopy;
    }

    // PRIMITIVE (encrypted string)
    if (typeof dataBeforeCopy === "string") {
        const decrypted = decryptascii(dataBeforeCopy);
        return autoType(decrypted);
    }

    // ARRAY / OBJECT
    if (
        typeof dataBeforeCopy === "object" &&
        !(dataBeforeCopy instanceof Date)
    ) {
        const data = Array.isArray(dataBeforeCopy)
            ? [...dataBeforeCopy]
            : { ...dataBeforeCopy };

        Object.keys(data).forEach((key) => {
            if (ignore.includes(key)) return;

            const val = data[key];

            if (typeof val === "string") {
                const dec = decryptascii(val);
                data[key] = autoType(dec);
            } else if (Array.isArray(val) || typeof val === "object") {
                data[key] = doDecrypt(val, ignore);
            }
        });

        return data;
    }

    return dataBeforeCopy;
}
