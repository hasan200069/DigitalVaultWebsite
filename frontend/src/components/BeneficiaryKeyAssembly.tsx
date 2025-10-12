import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ShamirService } from '../utils/shamirService';
import { useCrypto } from '../utils/useCrypto';
import { inheritanceApiService } from '../services/inheritanceApi';
import type { ShamirShare } from '../utils/shamirService';

interface BeneficiaryKeyAssemblyProps {
  planId: string;
  onVMKReconstructed: (vmk: any) => void;
}

interface TrusteeShare {
  trusteeId: string;
  trusteeName: string;
  trusteeEmail: string;
  share: ShamirShare;
  isAvailable: boolean;
}

const BeneficiaryKeyAssembly: React.FC<BeneficiaryKeyAssemblyProps> = ({ 
  planId, 
  onVMKReconstructed 
}) => {
  const { getCurrentVMK } = useCrypto();
  const [trusteeShares, setTrusteeShares] = useState<TrusteeShare[]>([]);
  const [collectedShares, setCollectedShares] = useState<ShamirShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructionStatus, setReconstructionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadTrusteeShares();
  }, [planId]);

  const loadTrusteeShares = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trustee shares from backend API
      const response = await inheritanceApiService.getTrusteeShares(planId);
      
      if (response.success && response.shares) {
        const shares: TrusteeShare[] = response.shares.map((share: any) => ({
          trusteeId: share.trusteeId,
          trusteeName: share.trusteeName,
          trusteeEmail: share.trusteeEmail,
          share: share.share,
          isAvailable: share.isAvailable
        }));
        
        setTrusteeShares(shares);
        console.log('Loaded trustee shares:', shares);
      } else {
        throw new Error(response.error || 'Failed to load trustee shares');
      }
    } catch (err) {
      console.error('Error loading trustee shares:', err);
      setError('Failed to load trustee shares');
    } finally {
      setLoading(false);
    }
  };

  const collectShare = (trusteeShare: TrusteeShare) => {
    if (!trusteeShare.isAvailable) {
      setError('This trustee share is not available');
      return;
    }

    // Check if we already have this share
    const alreadyCollected = collectedShares.some(share => share.index === trusteeShare.share.index);
    if (alreadyCollected) {
      setError('You already have this share');
      return;
    }

    setCollectedShares(prev => [...prev, trusteeShare.share]);
    setError(null);
  };

  const removeShare = (shareIndex: number) => {
    setCollectedShares(prev => prev.filter(share => share.index !== shareIndex));
  };

  const reconstructVMK = async () => {
    if (collectedShares.length < 2) {
      setError('At least 2 shares are required to reconstruct the VMK');
      return;
    }

    try {
      setIsReconstructing(true);
      setError(null);
      setReconstructionStatus('idle');

      // Get the VMK salt from the current crypto service
      const currentVMK = getCurrentVMK();
      if (!currentVMK) {
        throw new Error('No VMK salt available for reconstruction');
      }

      // In production, we would need the trustee private keys to decrypt shares
      // For now, we'll show that the shares are collected but cannot be decrypted without trustee keys
      console.log('Collected shares for reconstruction:', collectedShares);
      
      // Check if we have enough shares for reconstruction
      if (collectedShares.length < 2) {
        throw new Error('Insufficient shares for reconstruction');
      }

      // In a real production environment, this would:
      // 1. Retrieve trustee private keys from secure storage
      // 2. Decrypt each share with the corresponding trustee's private key
      // 3. Combine the decrypted shares using Shamir's algorithm
      // 4. Reconstruct the original VMK
      
      // For now, we'll indicate that reconstruction requires trustee keys
      setError('VMK reconstruction requires trustee private keys. In production, trustees would provide their private keys to decrypt their shares.');
      setReconstructionStatus('error');

    } catch (err) {
      console.error('Error reconstructing VMK:', err);
      setError(err instanceof Error ? err.message : 'Failed to reconstruct VMK');
      setReconstructionStatus('error');
    } finally {
      setIsReconstructing(false);
    }
  };

  const canReconstruct = collectedShares.length >= 2;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500">Loading trustee shares...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center mb-6">
        <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Key Assembly</h2>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {reconstructionStatus === 'success' && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-sm text-green-700">VMK successfully reconstructed!</p>
          </div>
        </div>
      )}

      {/* Available Trustee Shares */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Trustee Shares</h3>
        <div className="space-y-3">
          {trusteeShares.map((trusteeShare) => (
            <div
              key={trusteeShare.trusteeId}
              className={`p-4 border rounded-lg ${
                trusteeShare.isAvailable 
                  ? 'border-gray-200 bg-gray-50' 
                  : 'border-gray-300 bg-gray-100 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{trusteeShare.trusteeName}</p>
                  <p className="text-sm text-gray-500">{trusteeShare.trusteeEmail}</p>
                  <p className="text-xs text-gray-400">Share Index: {trusteeShare.share.index}</p>
                </div>
                <button
                  onClick={() => collectShare(trusteeShare)}
                  disabled={!trusteeShare.isAvailable || collectedShares.some(s => s.index === trusteeShare.share.index)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {collectedShares.some(s => s.index === trusteeShare.share.index) ? 'Collected' : 'Collect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collected Shares */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Collected Shares ({collectedShares.length})
        </h3>
        {collectedShares.length === 0 ? (
          <p className="text-gray-500 text-sm">No shares collected yet</p>
        ) : (
          <div className="space-y-2">
            {collectedShares.map((share) => (
              <div key={share.index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">Share {share.index}</span>
                <button
                  onClick={() => removeShare(share.index)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reconstruction Button */}
      <div className="flex justify-center">
        <button
          onClick={reconstructVMK}
          disabled={!canReconstruct || isReconstructing}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isReconstructing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Reconstructing...
            </>
          ) : (
            <>
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              Reconstruct VMK
            </>
          )}
        </button>
      </div>

      {!canReconstruct && (
        <p className="text-center text-sm text-gray-500 mt-3">
          Collect at least 2 shares to reconstruct the VMK
        </p>
      )}
    </div>
  );
};

export default BeneficiaryKeyAssembly;
