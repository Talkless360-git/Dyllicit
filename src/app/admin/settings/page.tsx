'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Save, Loader2, Percent, Share2 } from 'lucide-react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import SubscriptionABI from "@/lib/blockchain/contracts/ChainStreamSubscription.json";

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState({ platformFee: 2.5, defaultRoyalty: 5.0, subscriptionFee: 0.01 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(d => {
        if (d.settings) {
          setFormData({ 
            platformFee: d.settings.platformFee || 2.5, 
            defaultRoyalty: d.settings.defaultRoyalty || 5.0,
            subscriptionFee: d.settings.subscriptionFee || 0.01
          });
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load settings:", e);
        setLoading(false); // Fallback to defaults
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      alert('Global settings updated in database successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [syncing, setSyncing] = useState(false);

  const handleSyncOnChain = async () => {
    if (!isConnected) {
      alert("Please connect your admin wallet first.");
      return;
    }
    setSyncing(true);
    try {
      // 1. Sync Price
      await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPrice',
        args: [parseEther(formData.subscriptionFee.toString())],
      });

      // 2. Sync Platform Fee (bps)
      // platformFee is % (e.g. 2.5), contract expects bps (e.g. 250)
      const bps = Math.round(formData.platformFee * 100);
      await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPlatformFee',
        args: [BigInt(bps)],
      });

      alert('Smart contract updated successfully! Please wait for transactions to confirm.');
    } catch (e: any) {
      console.error(e);
      alert(`On-chain sync failed: ${e.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="admin-settings animate-fade-in">
      <div className="header">
        <h1>Protocol Configuration</h1>
        <p>Manage platform-wide financial rates and smart contract configurations.</p>
      </div>

      <div className="settings-container glass">
        <div className="form-group">
          <label>Platform Fee (%)</label>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.01" 
              value={formData.platformFee}
              onChange={(e) => setFormData({...formData, platformFee: parseFloat(e.target.value)})}
            />
            <Percent size={16} />
          </div>
          <p className="hint">The percentage of every subscription or NFT sale retained by the platform.</p>
        </div>

        <div className="form-group">
          <label>Monthly Subscription Fee (ETH)</label>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.001" 
              value={formData.subscriptionFee}
              onChange={(e) => setFormData({...formData, subscriptionFee: parseFloat(e.target.value)})}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', paddingRight: '0.5rem' }}>ETH</span>
          </div>
          <p className="hint">The price users pay to unlock premium features and support artists.</p>
        </div>

        <div className="form-group">
          <label>Default Creator Royalty (%)</label>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.01" 
              value={formData.defaultRoyalty}
              onChange={(e) => setFormData({...formData, defaultRoyalty: parseFloat(e.target.value)})}
            />
            <Percent size={16} />
          </div>
          <p className="hint">The default royalty pool allocated to creators for streaming their content.</p>
        </div>

        <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Update Database'}
          </Button>
          
          <Button variant="secondary" onClick={handleSyncOnChain} disabled={syncing}>
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            {syncing ? 'Broadcasting...' : 'Sync to Blockchain'}
          </Button>
        </div>
        
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.5 }}>
          <strong>Note:</strong> "Update Database" affects the UI and metadata. "Sync to Blockchain" updates the actual enforcement rules on the smart contract.
        </p>
      </div>

      <style jsx>{`
        .header { margin-bottom: 2rem; }
        .header h1 { margin: 0 0 0.5rem; }
        .header p { opacity: 0.6; margin: 0; }
        .settings-container {
          padding: 2.5rem;
          border-radius: 1rem;
          max-width: 600px;
        }
        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label { font-weight: bold; opacity: 0.8; }
        .hint { font-size: 0.8rem; opacity: 0.5; margin: 0; }
        .input-with-icon {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding-right: 1rem;
          transition: 0.2s;
        }
        .input-with-icon:focus-within { border-color: var(--primary); }
        .input-with-icon input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 0.75rem 1rem;
          outline: none;
        }
      `}</style>
    </div>
  );
}
