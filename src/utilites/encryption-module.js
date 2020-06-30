import CryptoJS from 'crypto-js';
import config from '../conf';

export function encryptObject(plainObj){

    var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(plainObj), this.enc_key).toString();
    let base64 = CryptoJS.enc.Base64.parse(ciphertext);
    let eHex = base64.toString(CryptoJS.enc.Hex);
    return eHex;
}

export function decryptObject(cipherObj){

    var reb64 = CryptoJS.enc.Hex.parse(cipherObj);
    var bytes = reb64.toString(CryptoJS.enc.Base64);
    var decrypt = CryptoJS.AES.decrypt(bytes, this.enc_key);
    var plainObj = decrypt.toString(CryptoJS.enc.Utf8);
    return JSON.parse(plainObj);

}
export function decryptValue(ciphertext){

    var reb64 = CryptoJS.enc.Hex.parse(ciphertext);
    var bytes = reb64.toString(CryptoJS.enc.Base64);
    var decrypt = CryptoJS.AES.decrypt(bytes, config.app['encryption_key']);
    var plaintext = decrypt.toString(CryptoJS.enc.Utf8);
    return plaintext;

}