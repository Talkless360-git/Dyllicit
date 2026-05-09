"use client";

import { useState, useRef } from "react";
import { Loader2, X, Info, Upload, Music, Film, Image as ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { getSigner } from "@/lib/blockchain/provider";
import { ethers, Contract } from "ethers";
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";
import { mintNFT } from "@/lib/blockchain/mint";

interface EditModalProps {
  media: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditModal({ media, onClose, onSuccess }: EditModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Uploading, 3: Burning, 4: Minting, 5: Syncing
  const [mintingFee, setMintingFee] = useState("0");

  const [formData, setFormData] = useState({
    title: media.title,
    description: media.description || "",
    genre: media.genre || "",
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Editing requires burning the old NFT and minting a new one. Proceed?`)) return;
    
    setLoading(true);
    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const contract = new Contract(NFTABI.address, NFTABI.abi, signer);

      // 0. Fetch current minting fee
      try {
        const fee = await contract.platformMintingFee();
        setMintingFee(ethers.formatEther(fee));
      } catch (e) {
        console.warn("Failed to fetch minting fee");
      }

      setStep(2); // Uploading
      let mediaUrl = media.url;
      let thumbnailUrl = media.thumbnailUrl;
      const newTokenId = (BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000))).toString();

      // Upload new audio if changed
      if (audioFile) {
        const uploadForms = new FormData();
        uploadForms.append('file', audioFile);
        uploadForms.append('tokenId', newTokenId);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadForms });
        if (!res.ok) throw new Error("Audio upload failed");
        const data = await res.json();
        mediaUrl = data.url;
      }

      // Upload new cover if changed
      if (coverFile) {
        const coverForms = new FormData();
        coverForms.append('file', coverFile);
        coverForms.append('tokenId', `${newTokenId}_cover`);
        const res = await fetch('/api/upload', { method: 'POST', body: coverForms });
        if (!res.ok) throw new Error("Cover upload failed");
        const data = await res.json();
        thumbnailUrl = data.url;
      }

      // Upload new metadata
      const metadata = {
        name: formData.title,
        description: formData.description,
        image: thumbnailUrl,
        animation_url: mediaUrl,
        attributes: [
          { trait_type: 'Genre', value: formData.genre },
          { trait_type: 'Type', value: media.type },
        ]
      };

      const metaRes = await fetch('/api/ipfs/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      if (!metaRes.ok) throw new Error("Metadata upload failed");
      const metaData = await metaRes.json();
      const metadataUrl = metaData.url;

      // 1. Blockchain Logic (Optional/Smart)
      let finalTokenId = media.tokenId;
      
      const burnAmount = media.totalShares || 1;
      let balance: bigint = BigInt(0);
      try {
        balance = await contract.balanceOf(signerAddress, media.tokenId);
      } catch (e) {}

      // ONLY re-mint if artist still owns 100% of shares. 
      // This ensures existing fans don't lose access to the media.
      if (balance >= BigInt(burnAmount)) {
        try {
          setStep(3); // Burning
          const burnTx = await contract.burn(signerAddress, media.tokenId, burnAmount);
          await burnTx.wait();

          setStep(4); // Minting
          await mintNFT(
            signer, 
            signerAddress, 
            newTokenId, 
            burnAmount, 
            metadataUrl, 
            500, 
            media.price || 0,
            mintingFee
          );
          finalTokenId = newTokenId;
        } catch (chainErr) {
          console.error("Blockchain update failed, falling back to DB update only:", chainErr);
        }
      }

      // 3. Sync Step (Always update DB)
      setStep(5);
      const res = await fetch("/api/artist/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: media.id,
          newTokenId: finalTokenId,
          newMetadataUrl: metadataUrl,
          newThumbnailUrl: thumbnailUrl,
          title: formData.title,
          description: formData.description,
          genre: formData.genre,
          url: mediaUrl
        })
      });
      
      const syncData = await res.json();
      if (syncData.success) {
        alert("Content updated successfully!");
        onSuccess();
        onClose();
      } else {
        throw new Error(syncData.error);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Edit failed: ${e.message}`);
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="edit-modal glass animate-scale-in">
        <div className="modal-header">
          <h3>Edit Content: {media.title}</h3>
          <button onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <form onSubmit={handleEdit} className="edit-form">
              <div className="info-box">
                <Info size={20} />
                <p>Changing files or title requires re-minting on the blockchain.</p>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Genre</label>
                  <input 
                    type="text" 
                    value={formData.genre}
                    onChange={e => setFormData({...formData, genre: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>New Audio/Video (Optional)</label>
                  <div className="file-box" onClick={() => audioInputRef.current?.click()}>
                    {media.type === 'audio' ? <Music size={18} /> : <Film size={18} />}
                    <span>{audioFile ? audioFile.name : "Keep Original"}</span>
                    <input ref={audioInputRef} type="file" style={{display:'none'}} onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div className="form-group">
                  <label>New Cover Photo (Optional)</label>
                  <div className="file-box" onClick={() => coverInputRef.current?.click()}>
                    <ImageIcon size={18} />
                    <span>{coverFile ? coverFile.name : "Keep Original"}</span>
                    <input ref={coverInputRef} type="file" style={{display:'none'}} onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <Button variant="glass" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={loading}>Update & Re-mint</Button>
              </div>
            </form>
          )}

          {loading && (
            <div className="loading-state">
              <Loader2 className="animate-spin" size={48} />
              <p>
                {step === 2 && "Uploading new files to IPFS..."}
                {step === 3 && "Burning original NFT..."}
                {step === 4 && "Minting updated NFT..."}
                {step === 5 && "Synchronizing database..."}
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .edit-modal {
          width: 90%; max-width: 600px;
          padding: 2rem; border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.5rem;
        }
        .modal-header h3 { margin: 0; font-size: 1.5rem; }
        .modal-header button { background: none; border: none; color: white; cursor: pointer; opacity: 0.5; }
        
        .info-box {
          display: flex; gap: 0.75rem; align-items: center;
          background: rgba(59, 130, 246, 0.1);
          padding: 1rem; border-radius: 0.75rem; margin-bottom: 1.5rem;
          color: #93c5fd; font-size: 0.85rem;
        }
        .info-box p { margin: 0; }
        
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .full-width { grid-column: span 2; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.8rem; font-weight: 600; opacity: 0.6; }
        input, textarea {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem; padding: 0.75rem; color: white; outline: none;
        }
        input:focus, textarea:focus { border-color: var(--primary); }
        
        .file-box {
          background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2);
          padding: 0.75rem; border-radius: 0.5rem; cursor: pointer;
          display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .file-box:hover { border-color: var(--primary); background: rgba(255,255,255,0.08); }
        
        .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        
        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 1.5rem; padding: 3rem 0;
        }
        .loading-state p { opacity: 0.8; font-weight: 500; text-align: center; }
      `}</style>
    </div>
  );
}
