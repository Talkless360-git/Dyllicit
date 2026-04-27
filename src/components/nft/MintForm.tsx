'use client';

import React, { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import { Upload, Music, Film, CheckCircle, Loader2 } from 'lucide-react';
import { mintNFT } from '@/lib/blockchain/mint';
import { getSigner } from '@/lib/blockchain/provider';

const MintForm: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'audio',
    genre: '',
    isGated: false,
    isAlbum: false,
    albumTitle: '',
    producer: '',
    releaseYear: new Date().getFullYear(),
    scheduledRelease: ''
  });
  
  const [defaultRoyalty, setDefaultRoyalty] = useState(5);
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Fetch global settings for royalty
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.defaultRoyalty) {
          setDefaultRoyalty(data.settings.defaultRoyalty);
        }
      })
      .catch(err => console.error("Failed to fetch settings:", err));
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select your media file first.");
      return;
    }
    if (!coverFile) {
      alert("Please select a cover photo.");
      return;
    }

    setIsMinting(true);
    
    try {
      let mediaUrl = '';
      let metadataUrl = '';
      let coverUrl = '';
      
      // Generate a unique token ID (Timestamp + Random to prevent collisions)
      const tokenId = (BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000))).toString();

      // 1. Upload Cover Photo
      if (coverFile) {
        const coverForms = new FormData();
        coverForms.append('file', coverFile);
        coverForms.append('tokenId', `${tokenId}_cover`);
        
        const coverRes = await fetch('/api/upload', { method: 'POST', body: coverForms });
        if (!coverRes.ok) {
          const err = await coverRes.json();
          throw new Error(`Cover upload failed: ${err.details || err.error}`);
        }
        
        const coverData = await coverRes.json();
        coverUrl = coverData.url; // This will be an IPFS URL from the proxy
      }

      // 2. Prepare metadata object
      const metadata = {
        name: formData.title,
        description: formData.description,
        image: coverUrl || 'https://gateway.pinata.cloud/ipfs/placeholder-hash',
        animation_url: '', // will be set below
        attributes: [
          { trait_type: 'Genre', value: formData.genre },
          { trait_type: 'Type', value: formData.type },
          { trait_type: 'Producer', value: formData.producer },
          { trait_type: 'Release Year', value: formData.releaseYear.toString() },
        ]
      };

      // 3. Upload Media File
      const uploadForms = new FormData();
      uploadForms.append('file', file);
      uploadForms.append('tokenId', tokenId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForms });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(`Media upload failed: ${err.details || err.error}`);
      }

      const uploadData = await uploadRes.json();
      mediaUrl = uploadData.url;
      metadata.animation_url = mediaUrl;

      // 4. Upload Metadata to IPFS
      const metaRes = await fetch('/api/ipfs/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      
      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(`Metadata pinning failed: ${err.details || err.error}`);
      }
      
      const metaData = await metaRes.json();
      metadataUrl = metaData.url;

      // 4. Trigger Blockchain Mint
      try {
        const signer = await getSigner();
        const address = await signer.getAddress();
        await mintNFT(signer, address, tokenId, 1, metadataUrl, defaultRoyalty * 100);
        
        // 5. Sync with Database
        const syncRes = await fetch('/api/nft/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorAddress: address,
            mediaData: {
              title: formData.title,
              description: formData.description,
              type: formData.type,
              url: mediaUrl,
              thumbnailUrl: metadata.image,
              genre: formData.genre,
              isGated: formData.isGated,
              producer: formData.producer,
              releaseYear: formData.releaseYear,
              scheduledRelease: formData.scheduledRelease ? new Date(formData.scheduledRelease).toISOString() : null,
              album: formData.isAlbum ? formData.albumTitle : null
            },
            nftData: {
              tokenId,
              metadataUrl,
              contractAddr: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            }
          })
        });

        if (!syncRes.ok) {
          const errorData = await syncRes.json();
          throw new Error(`Sync Error: ${errorData.details || errorData.error || "Database synchronization failed."}`);
        }
      } catch (innerError: any) {
        console.error("Detailed Minting Error:", innerError);
        
        let errorMessage = "Blockchain transaction failed. Check MetaMask.";
        
        if (innerError.message?.includes("Sync Error:")) {
           errorMessage = innerError.message;
        } else if (innerError.message?.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas. Please get some testnet ETH.";
        } else if (innerError.message?.includes("user rejected") || innerError.code === "ACTION_REJECTED") {
          errorMessage = "Transaction rejected in MetaMask.";
        } else if (innerError.message?.includes("onlyOwner") || (innerError.data && JSON.stringify(innerError.data).includes("onlyOwner"))) {
          errorMessage = "Only the contract owner can mint. Ensure you are using the deployer wallet.";
        } else if (innerError.message?.includes("revert")) {
          // Extract revert reason if possible
          const match = innerError.message.match(/reverted with reason string ["'](.*?)["']/);
          errorMessage = match ? `Contract Revert: ${match[1]}` : `Contract Revert (No reason). Raw: ${innerError.message.substring(0, 50)}...`;
        } else if (innerError.reason) {
          errorMessage = `Blockchain Error: ${innerError.reason}`;
        } else if (innerError.error?.message) {
          errorMessage = innerError.error.message;
        } else if (innerError.message) {
          // Truncate very long technical messages for the UI
          errorMessage = innerError.message.length > 100 
            ? innerError.message.substring(0, 100) + "..." 
            : innerError.message;
        }
        
        throw new Error(errorMessage);
      }

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error: any) {
      console.error("Minting process failed:", error);
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setIsMinting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mint-success animate-fade-in">
        <CheckCircle size={64} color="var(--success)" />
        <h2>NFT Minted Successfully!</h2>
        <p>Your content is now live on the Dyllicit Protocol.</p>
        <Button variant="glass" onClick={() => setIsSuccess(false)}>Mint Another</Button>
      </div>
    );
  }

  return (
    <form className="mint-form glass animate-fade-in" onSubmit={handleSubmit}>
      <div className="form-header">
        <Upload size={32} />
        <h2>Mint New Content</h2>
      </div>

      <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept={formData.type === 'audio' ? 'audio/*' : 'video/*'}
          onChange={handleFileChange}
        />
        <div className="upload-placeholder">
          {formData.type === 'audio' ? <Music size={48} /> : <Film size={48} />}
          <p>{file ? file.name : `Click to upload your ${formData.type} file`}</p>
          <p className="hint">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Max size: 50MB'}</p>
        </div>
      </div>

      <div className="upload-area" style={{ padding: "1.5rem" }} onClick={() => coverInputRef.current?.click()}>
        <input 
          type="file" 
          ref={coverInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleCoverChange}
        />
        <div className="upload-placeholder">
          <p style={{ margin: 0, fontWeight: "bold" }}>{coverFile ? coverFile.name : `Click to upload Cover Photo (Image)`}</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Content Title</label>
          <input 
            type="text" 
            placeholder="e.g. Midnight Solitude" 
            required 
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Genre</label>
          <input 
            type="text" 
            placeholder="e.g. Lofi, Jazz, Techno" 
            value={formData.genre}
            onChange={(e) => setFormData({...formData, genre: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Producer</label>
          <input 
            type="text" 
            placeholder="e.g. Dr. Dre, Metro Boomin" 
            value={formData.producer}
            onChange={(e) => setFormData({...formData, producer: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Release Year</label>
          <input 
            type="number" 
            value={formData.releaseYear}
            onChange={(e) => setFormData({...formData, releaseYear: parseInt(e.target.value)})}
          />
        </div>

        <div className="form-group">
          <label>Scheduled Release (Optional)</label>
          <input 
            type="date" 
            value={formData.scheduledRelease}
            onChange={(e) => setFormData({...formData, scheduledRelease: e.target.value})}
          />
        </div>

        <div className="form-group checkbox-group" style={{ marginBottom: "0" }}>
           <input 
            type="checkbox" 
            id="isAlbum"
            checked={formData.isAlbum}
            onChange={(e) => setFormData({...formData, isAlbum: e.target.checked})}
          />
          <label htmlFor="isAlbum">This is an Album (or part of one)</label>
        </div>

        {formData.isAlbum && (
           <div className="form-group" style={{ gridColumn: "span 2" }}>
             <label>Album Name</label>
             <input 
               type="text" 
               placeholder="Enter Album Name" 
               value={formData.albumTitle}
               onChange={(e) => setFormData({...formData, albumTitle: e.target.value})}
             />
           </div>
        )}

        <div className="form-group">
          <label>Content Type</label>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="audio">Audio Track</option>
            <option value="video">Video Montage</option>
          </select>
        </div>

        <div className="form-group">
          <label>Platform Standards</label>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
            Royalty set by Admin: <strong>{defaultRoyalty}%</strong>
          </div>
        </div>

        <div className="form-group full-width">
          <label>Description</label>
          <textarea 
            rows={3} 
            placeholder="Tell your fans about this creation..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>

        <div className="form-group checkbox-group">
          <input 
            type="checkbox" 
            id="isGated"
            checked={formData.isGated}
            onChange={(e) => setFormData({...formData, isGated: e.target.checked})}
          />
          <label htmlFor="isGated">Gated Content (Only NFT holders can stream)</label>
        </div>
      </div>

      <Button variant="primary" size="lg" disabled={isMinting} type="submit" fullWidth>
        {isMinting ? 'Minting on Blockchain...' : 'Create & Mint NFT'}
      </Button>

      <style jsx>{`
        .mint-form {
          padding: 3rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .form-header {
          text-align: center;
          margin-bottom: 2rem;
          color: var(--primary);
        }
        .upload-area {
          border: 2px dashed var(--glass-border);
          border-radius: 1rem;
          padding: 3rem;
          text-align: center;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.02);
          transition: var(--transition);
        }
        .upload-area:hover {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.04);
        }
        .upload-placeholder p {
          margin-top: 1rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .hint {
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .full-width {
          grid-column: span 2;
        }
        label {
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.8;
        }
        input, select, textarea {
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: white;
          font-family: inherit;
          outline: none;
          transition: var(--transition);
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        .checkbox-group {
          flex-direction: row;
          align-items: center;
          grid-column: span 2;
        }
        .checkbox-group label {
          font-weight: 400;
        }
        .mint-success {
          text-align: center;
          padding: 5rem 2rem;
        }
        .mint-success h2 {
          margin: 2rem 0 1rem;
        }
        .mint-success p {
          margin-bottom: 3rem;
          opacity: 0.7;
        }
      `}</style>
    </form>
  );
};

export default MintForm;
