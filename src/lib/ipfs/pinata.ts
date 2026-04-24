import { NextResponse } from "next/server";

const getHeaders = () => {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (jwt) {
    return {
      Authorization: `Bearer ${jwt}`,
    };
  }

  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    };
  }

  throw new Error("Pinata credentials (JWT or API Key/Secret) are missing.");
};

const getGateway = () => {
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  if (!gateway) return "https://gateway.pinata.cloud/ipfs";
  
  // Ensure it starts with https:// and doesn't end with a slash
  let formatted = gateway.startsWith('http') ? gateway : `https://${gateway}`;
  if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
  if (!formatted.includes('/ipfs')) formatted = `${formatted}/ipfs`;
  
  return formatted;
};

export const uploadToIPFS = async (file: File | Blob, fileName?: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: fileName || (file instanceof File ? file.name : 'upload'),
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', options);

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        ...getHeaders(),
      } as HeadersInit,
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Pinata File Upload Error: ${JSON.stringify(errorData)}`);
    }

    const resData = await res.json();
    const gateway = getGateway();
    return {
      hash: resData.IpfsHash,
      url: `${gateway}/${resData.IpfsHash}`
    };
  } catch (error: any) {
    console.error('IPFS Upload Error:', error);
    throw error;
  }
};

export const uploadJSONToIPFS = async (json: object, name: string = 'metadata.json') => {
  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
      } as HeadersInit,
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: {
          name: name,
        },
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Pinata JSON Upload Error: ${JSON.stringify(errorData)}`);
    }

    const resData = await res.json();
    const gateway = getGateway();
    return {
      hash: resData.IpfsHash,
      url: `${gateway}/${resData.IpfsHash}`
    };
  } catch (error: any) {
    console.error('IPFS JSON Upload Error:', error);
    throw error;
  }
};
