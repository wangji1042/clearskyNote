/** 加密数据前缀标识 */
const CIPHER_PREFIX = "enc:v1:";

/** 内置基础密钥 */
const BASE_SECRET_KEY = "clearsky-note#credential-secret#v1";

/** 文本编码器 */
const textEncoder = new TextEncoder();

/** 文本解码器 */
const textDecoder = new TextDecoder();

/** 生成指定长度的随机字节 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = (Math.random() * 256) | 0;
    }
  }
  return bytes;
}

/** 字节数组转十六进制字符串 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 十六进制字符串转字节数组 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * RC4 流密码对称加解密转换
 */
function rc4Transform(key: Uint8Array, input: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
  }
  const output = new Uint8Array(input.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < input.length; k++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
    output[k] = input[k] ^ s[(s[i] + s[j]) & 255];
  }
  return output;
}

/**
 * 对敏感字符串进行加密存储，防止在本地存储和浏览文件时直接暴露明文
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) {
    return "";
  }
  try {
    // 随机 8 字节盐
    const saltBytes = getRandomBytes(8);
    const saltHex = bytesToHex(saltBytes);
    const derivedKey = textEncoder.encode(BASE_SECRET_KEY + saltHex);
    const plainBytes = textEncoder.encode(plainText);
    const cipherBytes = rc4Transform(derivedKey, plainBytes);
    return `${CIPHER_PREFIX}${saltHex}:${bytesToHex(cipherBytes)}`;
  } catch {
    return plainText;
  }
}

/**
 * 解密由 {@link encryptSecret} 加密的敏感字符串；若为明文或解密失败则安全降级返回原字符串
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) {
    return "";
  }
  // 未带有加密前缀时，视为历史未加密明文，直接兼容返回
  if (!cipherText.startsWith(CIPHER_PREFIX)) {
    return cipherText;
  }
  try {
    const payload = cipherText.slice(CIPHER_PREFIX.length);
    const separatorIndex = payload.indexOf(":");
    if (separatorIndex === -1) {
      return cipherText;
    }
    const saltHex = payload.slice(0, separatorIndex);
    const cipherHex = payload.slice(separatorIndex + 1);
    const derivedKey = textEncoder.encode(BASE_SECRET_KEY + saltHex);
    const cipherBytes = hexToBytes(cipherHex);
    const plainBytes = rc4Transform(derivedKey, cipherBytes);
    return textDecoder.decode(plainBytes);
  } catch {
    return cipherText;
  }
}
