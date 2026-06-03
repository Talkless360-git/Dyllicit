'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Upload, Music, Film, CheckCircle, Loader2 } from 'lucide-react';
import { mintNFT } from '@/lib/blockchain/mint';
import { getSigner } from '@/lib/blockchain/provider';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";

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
    scheduledRelease: '',
    price: 0,
    totalShares: 1, // Default to 1 (unfractionalized)
    fractionalRoyalty: 0 // % of artist royalty given to holders
  });
  
  const [defaultRoyalty, setDefaultRoyalty] = useState(5);
  const [platformMintingFee, setPlatformMintingFee] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // AI Lyrics State
  const [lyrics, setLyrics] = useState('');
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'transcribing' | 'completed' | 'approved'>('idle');
  const [lyricsApproved, setLyricsApproved] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch global settings for royalty from blockchain
  const { data: onChainRoyalty } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'globalRoyaltyBps',
    query: {
      enabled: mounted
    }
  });

  const { data: onChainMintingFee } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'platformMintingFee',
    query: {
      enabled: mounted
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (onChainRoyalty !== undefined) {
      setDefaultRoyalty(Number(onChainRoyalty) / 100);
    }
    if (onChainMintingFee !== undefined) {
      setPlatformMintingFee(formatEther(onChainMintingFee as bigint));
    }
  }, [onChainRoyalty, onChainMintingFee]);

  // Guard return MUST be after all hooks
  if (!mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      if (formData.type === 'audio') {
        const previewUrl = URL.createObjectURL(selectedFile);
        setAudioPreviewUrl(previewUrl);
        setLyrics('');
        setLyricsStatus('idle');
        setLyricsApproved(false);
      } else {
        setAudioPreviewUrl('');
        setLyrics('');
        setLyricsStatus('idle');
        setLyricsApproved(false);
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      alert("Please select your audio file first.");
      return;
    }
    
    setLyricsStatus('transcribing');
    setLyricsApproved(false);
    
    try {
      const transFormData = new FormData();
      transFormData.append('file', file);
      
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: transFormData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || "Failed to transcribe audio.");
      }
      
      const data = await res.json();
      setLyrics(data.text || '');
      setLyricsStatus('completed');
    } catch (error: any) {
      console.error("Transcription failed:", error);
      alert(`Transcription Error: ${error.message}`);
      setLyricsStatus('idle');
    }
  };

  const handleApproveLyrics = () => {
    if (!lyrics.trim()) {
      alert("Cannot approve empty lyrics.");
      return;
    }
    setLyricsApproved(true);
    setLyricsStatus('approved');
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

    if (formData.type === 'audio') {
      if (lyricsStatus === 'transcribing') {
        alert("Transcription is still in progress. Please wait.");
        return;
      }
      if (!lyricsApproved) {
        alert("Please review and approve the generated lyrics before proceeding to mint.");
        return;
      }
    }

    setIsMinting(true);
    
    try {
      let mediaUrl = '';
      let metadataUrl = '';
      let coverUrl = '';
      
      const tokenId = (BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000))).toString();

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
        coverUrl = coverData.url;
      }

      const metadata = {
        name: formData.title,
        description: formData.description,
        image: coverUrl || 'https://gateway.pinata.cloud/ipfs/placeholder-hash',
        animation_url: '', 
        lyrics: formData.type === 'audio' ? lyrics : undefined,
        attributes: [
          { trait_type: 'Genre', value: formData.genre },
          { trait_type: 'Type', value: formData.type },
          { trait_type: 'Producer', value: formData.producer },
          { trait_type: 'Release Year', value: formData.releaseYear.toString() },
        ]
      };

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

      try {
        const signer = await getSigner();
        const address = await signer.getAddress();
        await mintNFT(
          signer, 
          address, 
          tokenId, 
          formData.totalShares, 
          metadataUrl, 
          defaultRoyalty * 100, 
          formData.price,
          platformMintingFee
        );
        
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
              album: formData.isAlbum ? formData.albumTitle : null,
              price: formData.price,
              totalShares: formData.totalShares,
              fractionalRoyalty: formData.fractionalRoyalty,
              lyrics: formData.type === 'audio' ? lyrics : null
            },
            nftData: {
              tokenId,
              metadataUrl,
              contractAddr: NFTABI.address,
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
        } else if (innerError.message?.includes("onlyOwner")) {
          errorMessage = "Only the contract owner can mint.";
        } else if (innerError.message?.includes("revert")) {
          const match = innerError.message.match(/reverted with reason string ["'](.*?)["']/);
          errorMessage = match ? `Contract Revert: ${match[1]}` : `Contract Revert.`;
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

      {formData.type === 'audio' && file && (
        <div className="lyrics-section glass animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <Music size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>AI-Powered Lyrics Studio</h3>
          </div>
          
          {audioPreviewUrl && (
            <div className="audio-preview-container">
              <audio src={audioPreviewUrl} controls className="styled-audio" />
              <div className="wave-visualization">
                <span className="bar animated-bar"></span>
                <span className="bar animated-bar" style={{ animationDelay: '0.2s' }}></span>
                <span className="bar animated-bar" style={{ animationDelay: '0.4s' }}></span>
                <span className="bar animated-bar" style={{ animationDelay: '0.1s' }}></span>
                <span className="bar animated-bar" style={{ animationDelay: '0.3s' }}></span>
                <span className="bar animated-bar" style={{ animationDelay: '0.5s' }}></span>
              </div>
            </div>
          )}

          {lyricsStatus === 'idle' && (
            <div className="lyrics-idle">
              <p>Generate high-accuracy lyrics with OpenAI Whisper automatically before minting.</p>
              <Button type="button" variant="primary" onClick={handleTranscribe}>
                Generate Lyrics with AI
              </Button>
            </div>
          )}

          {lyricsStatus === 'transcribing' && (
            <div className="lyrics-loading">
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
              <p>AI speech-to-text engine is processing audio...</p>
              <div className="progress-bar-placeholder">
                <div className="progress-bar-fill-animated"></div>
              </div>
              <span className="loading-status">Analyzing frequencies & structuring lyrics...</span>
            </div>
          )}

          {(lyricsStatus === 'completed' || lyricsStatus === 'approved') && (
            <div className="lyrics-editor-container">
              <label>Generated Lyrics (Editable)</label>
              <textarea
                value={lyrics}
                onChange={(e) => {
                  setLyrics(e.target.value);
                  setLyricsApproved(false);
                  setLyricsStatus('completed');
                }}
                rows={10}
                placeholder="Edit, format or review the lyrics here..."
                disabled={lyricsStatus === 'approved'}
                className="lyrics-textarea"
              />
              
              <div className="lyrics-buttons">
                <Button 
                  type="button" 
                  variant="glass" 
                  onClick={handleTranscribe}
                  disabled={lyricsStatus === 'approved'}
                >
                  Regenerate Lyrics
                </Button>
                
                {lyricsStatus !== 'approved' ? (
                  <Button 
                    type="button" 
                    variant="primary" 
                    onClick={handleApproveLyrics}
                  >
                    Approve Lyrics
                  </Button>
                ) : (
                  <div className="approved-tag">
                    <CheckCircle size={16} color="var(--success)" />
                    <span>Lyrics Approved & Locked</span>
                    <Button 
                      type="button" 
                      variant="glass" 
                      size="sm" 
                      onClick={() => {
                        setLyricsApproved(false);
                        setLyricsStatus('completed');
                      }}
                      style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', height: 'auto', fontSize: '0.8rem' }}
                    >
                      Unlock to Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
          <label>Collection Price (ETH)</label>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.0001" 
              placeholder="e.g. 0.005"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', paddingRight: '0.5rem' }}>ETH</span>
          </div>
          <p className="hint">Price fans pay to permanently own an NFT copy.</p>
        </div>

        <div className="form-group">
          <label>Platform Standards</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
              Artist Royalty: <strong>{defaultRoyalty}%</strong>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid var(--primary)' }}>
              Minting Fee: <strong>{platformMintingFee} ETH</strong>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Fractional Shares</label>
          <input 
            type="number" 
            min="1"
            value={formData.totalShares}
            onChange={(e) => setFormData({...formData, totalShares: parseInt(e.target.value) || 1})}
          />
          <p className="hint">Number of investment shares to create. Works even if content is public!</p>
        </div>

        <div className="form-group">
          <label>Holder Royalty Split (%)</label>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.1"
              max="100"
              placeholder="e.g. 50"
              value={formData.fractionalRoyalty}
              onChange={(e) => setFormData({...formData, fractionalRoyalty: parseFloat(e.target.value) || 0})}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', paddingRight: '0.5rem' }}>%</span>
          </div>
          <p className="hint">% of your streaming earnings given to share holders.</p>
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
          <label htmlFor="isGated">
            <strong>NFT Gated (Private)</strong> — Only share holders can stream this content.
          </label>
        </div>
      </div>

      <Button variant="primary" size="lg" disabled={isMinting} type="submit" fullWidth>
        {isMinting ? 'Minting on Blockchain...' : 'Create & Mint NFT'}
      </Button>

      <style jsx>{`
        .mint-form { padding: 3rem; max-width: 700px; margin: 0 auto; }
        .form-header { text-align: center; margin-bottom: 2rem; color: var(--primary); }
        .upload-area { border: 2px dashed var(--glass-border); border-radius: 1rem; padding: 3rem; text-align: center; margin-bottom: 2rem; background: rgba(255, 255, 255, 0.02); transition: var(--transition); cursor: pointer; }
        .upload-area:hover { border-color: var(--primary); background: rgba(255, 255, 255, 0.04); }
        .upload-placeholder p { margin-top: 1rem; color: rgba(255, 255, 255, 0.6); }
        .hint { font-size: 0.8rem; opacity: 0.5; }
        
        /* Lyrics Studio Styles */
        .lyrics-section {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--glass-border);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: left;
        }
        .audio-preview-container {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 0.75rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .styled-audio {
          flex: 1;
          height: 36px;
        }
        .wave-visualization {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 24px;
          padding: 0 0.5rem;
        }
        .wave-visualization .bar {
          width: 3px;
          background: var(--primary);
          border-radius: 3px;
        }
        @keyframes waveAnim {
          0%, 100% { height: 6px; }
          50% { height: 24px; }
        }
        .animated-bar {
          animation: waveAnim 1.2s ease-in-out infinite;
          height: 6px;
        }
        .lyrics-idle {
          text-align: center;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 0.5rem;
        }
        .lyrics-idle p {
          margin-bottom: 1.5rem;
          opacity: 0.7;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .lyrics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 0.5rem;
          text-align: center;
        }
        .lyrics-loading p {
          font-weight: 600;
          opacity: 0.9;
          margin: 0;
        }
        .progress-bar-placeholder {
          width: 100%;
          max-width: 350px;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-bar-fill-animated {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          width: 50%;
          border-radius: 3px;
          animation: loadAnim 2s infinite ease-in-out;
        }
        @keyframes loadAnim {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .loading-status {
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .lyrics-editor-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .lyrics-editor-container label {
          font-size: 0.85rem;
          font-weight: 600;
          opacity: 0.7;
        }
        .lyrics-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          padding: 1rem;
          color: white;
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          transition: var(--transition);
        }
        .lyrics-textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .lyrics-textarea:disabled {
          opacity: 0.8;
          background: rgba(255, 255, 255, 0.01);
          color: rgba(255, 255, 255, 0.8);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .lyrics-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          gap: 1rem;
        }
        .approved-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 0.5rem 1.25rem;
          border-radius: 2rem;
          color: var(--success);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .full-width { grid-column: span 2; }
        label { font-size: 0.9rem; font-weight: 600; opacity: 0.8; }
        input, select, textarea { background: var(--input-bg); border: 1px solid var(--glass-border); border-radius: 0.5rem; padding: 0.75rem; color: white; font-family: inherit; outline: none; transition: var(--transition); }
        input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2); }
        .checkbox-group { flex-direction: row; align-items: center; grid-column: span 2; gap: 0.75rem; }
        .checkbox-group label { font-weight: 400; cursor: pointer; }
        .mint-success { text-align: center; padding: 5rem 2rem; }
        .mint-success h2 { margin: 2rem 0 1rem; }
        .mint-success p { margin-bottom: 3rem; opacity: 0.7; }
      `}</style>
    </form>
  );
};

export default MintForm;
