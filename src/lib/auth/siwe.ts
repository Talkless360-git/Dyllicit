import { SiweMessage } from 'siwe';
import { generateNonce } from 'siwe';

export const createSiweMessage = (address: string, statement: string, chainId: number) => {
  const domain = window.location.host;
  const origin = window.location.origin;
  
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId,
    nonce: generateNonce(),
  });
  
  return message.prepareMessage();
};

export const verifySiweSignature = async (message: string, signature: string) => {
  const siweMessage = new SiweMessage(message);
  try {
    const { data } = await siweMessage.verify({ signature });
    return data;
  } catch (error) {
    console.error('SIWE Verification Error:', error);
    return null;
  }
};
