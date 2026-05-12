import { createMessage, encrypt, readKey } from "openpgp";

export const encryptText = async (
  unencryptedText: string,
  publicKey: string,
) => {
  const key = await readKey({ armoredKey: publicKey });

  const message = await createMessage({ text: unencryptedText });

  const encryptedText = await encrypt({
    message,
    encryptionKeys: key,
  });

  return encryptedText;
};
