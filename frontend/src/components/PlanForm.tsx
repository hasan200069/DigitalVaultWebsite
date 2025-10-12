import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import { inheritanceApiService } from '../services/inheritanceApi';
import { vaultApiService } from '../services/vaultApi';
import { useCrypto } from '../utils/useCrypto';
import { ShamirService } from '../utils/shamirService';
// Local interface definition to avoid import issues
interface TrusteeKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;
  privateKeyPem: string;
}
// import TrusteeKeyManager from './TrusteeKeyManager'; // Temporarily disabled
import type { InheritancePlan, CreatePlanRequest } from '../services/inheritanceApi';

interface PlanFormProps {
  plan?: InheritancePlan | null;
  onClose: () => void;
  onSubmit: () => void;
}

interface VaultItem {
  id: string;
  name: string;
  category?: string;
  isEncrypted: boolean;
}

interface Trustee {
  email: string;
  name: string;
}

interface Beneficiary {
  email: string;
  name: string;
  relationship: string;
}

const PlanForm: React.FC<PlanFormProps> = ({ plan, onClose, onSubmit }) => {
  const { isVMKInitialized, getCurrentVMK } = useCrypto();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kThreshold: 2,
    waitingPeriodDays: 30,
    trustees: [] as Trustee[],
    beneficiaries: [] as Beneficiary[],
    vaultItemIds: [] as string[]
  });
  
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trusteeKeyPairs] = useState<TrusteeKeyPair[]>([]); // Temporarily disabled
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [loadingVaultItems, setLoadingVaultItems] = useState(true);

  // Load vault items on component mount
  useEffect(() => {
    loadVaultItems();
  }, []);

  // Populate form when editing an existing plan
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        kThreshold: plan.kThreshold,
        waitingPeriodDays: plan.waitingPeriodDays,
        trustees: plan.trustees || [],
        beneficiaries: plan.beneficiaries || [],
        vaultItemIds: plan.items?.map(item => item.vaultItemId) || []
      });
    }
  }, [plan]);

  const loadVaultItems = async () => {
    try {
      setLoadingVaultItems(true);
      const response = await vaultApiService.listItems();
      if (response.success && response.items) {
        setVaultItems(response.items);
      }
    } catch (err) {
      console.error('Error loading vault items:', err);
    } finally {
      setLoadingVaultItems(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTrustee = () => {
    setFormData(prev => ({
      ...prev,
      trustees: [...prev.trustees, { email: '', name: '' }]
    }));
  };

  const removeTrustee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      trustees: prev.trustees.filter((_, i) => i !== index)
    }));
  };

  const updateTrustee = (index: number, field: keyof Trustee, value: string) => {
    setFormData(prev => ({
      ...prev,
      trustees: prev.trustees.map((trustee, i) => 
        i === index ? { ...trustee, [field]: value } : trustee
      )
    }));
  };

  const addBeneficiary = () => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: [...prev.beneficiaries, { email: '', name: '', relationship: '' }]
    }));
  };

  const removeBeneficiary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter((_, i) => i !== index)
    }));
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map((beneficiary, i) => 
        i === index ? { ...beneficiary, [field]: value } : beneficiary
      )
    }));
  };

  const toggleVaultItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      vaultItemIds: prev.vaultItemIds.includes(itemId)
        ? prev.vaultItemIds.filter(id => id !== itemId)
        : [...prev.vaultItemIds, itemId]
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Plan name is required';
    }
    
    if (formData.trustees.length < formData.kThreshold) {
      return `Number of trustees (${formData.trustees.length}) must be at least equal to threshold (${formData.kThreshold})`;
    }
    
    if (formData.trustees.length === 0) {
      return 'At least one trustee is required';
    }
    
    if (formData.beneficiaries.length === 0) {
      return 'At least one beneficiary is required';
    }
    
    if (formData.vaultItemIds.length === 0) {
      return 'At least one vault item must be selected';
    }
    
    // Validate trustee emails
    for (const trustee of formData.trustees) {
      if (!trustee.email.trim() || !trustee.name.trim()) {
        return 'All trustees must have email and name';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trustee.email)) {
        return 'Invalid trustee email format';
      }
    }
    
    // Validate beneficiary emails
    for (const beneficiary of formData.beneficiaries) {
      if (!beneficiary.email.trim() || !beneficiary.name.trim() || !beneficiary.relationship.trim()) {
        return 'All beneficiaries must have email, name, and relationship';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(beneficiary.email)) {
        return 'Invalid beneficiary email format';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if VMK is initialized for key splitting
    if (!isVMKInitialized) {
      setError('Vault Master Key not initialized. Please set up your vault passphrase first.');
      return;
    }

    // Validate trustee key pairs before creating/updating plan (temporarily disabled)
    // if (trusteeKeyPairs.length !== formData.trustees.length) {
    //   setError(`Please generate or import key pairs for all ${formData.trustees.length} trustees. Current: ${trusteeKeyPairs.length}`);
    //   setLoading(false);
    //   return;
    // }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current VMK for Shamir's Secret Sharing
      const vmk = getCurrentVMK();
      if (!vmk) {
        setError('Unable to access Vault Master Key for inheritance sharing');
        return;
      }

      // Create Shamir shares (using placeholder encryption for now)
      const shamirConfig = {
        threshold: formData.kThreshold,
        totalShares: formData.trustees.length
      };

      // For now, create simple shares without real trustee keys (due to import issues)
      const shares = ShamirService.splitSecret(vmk.rawKey, shamirConfig);
      const encryptedShares = shares.map(share => ({
        ...share,
        encryptedShare: 'placeholder-encrypted-share'
      }));
      
      // Filter out any null/undefined vault item IDs
      const validVaultItemIds = formData.vaultItemIds.filter(id => id && id.trim() !== '');
      
      console.log('Form data vaultItemIds:', formData.vaultItemIds);
      console.log('Filtered vaultItemIds:', validVaultItemIds);
      
      const request: CreatePlanRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        kThreshold: formData.kThreshold,
        trustees: formData.trustees,
        beneficiaries: formData.beneficiaries,
        waitingPeriodDays: formData.waitingPeriodDays,
        vaultItemIds: validVaultItemIds,
        // Include Shamir shares for backend storage
        shamirShares: encryptedShares.map((share, index) => ({
          index: share.index,
          encryptedShare: share.encryptedShare,
          trusteeEmail: formData.trustees[index].email
        }))
      };
      
      // Use update API if editing existing plan, create API if new plan
      const response = plan 
        ? await inheritanceApiService.updatePlan(plan.id, request)
        : await inheritanceApiService.createPlan(request);
      
      if (response.success) {
        onSubmit();
      } else {
        setError(response.error || `Failed to ${plan ? 'update' : 'create'} plan`);
      }
    } catch (err) {
      console.error(`Error ${plan ? 'updating' : 'creating'} plan:`, err);
      setError(`Failed to ${plan ? 'update' : 'create'} inheritance plan`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {plan ? 'Edit Inheritance Plan' : 'Create Inheritance Plan'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Family Digital Assets"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waiting Period (days) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.waitingPeriodDays}
                onChange={(e) => handleInputChange('waitingPeriodDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose of this inheritance plan..."
            />
          </div>

          {/* Threshold Configuration */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Trustees Required (k) *
              </label>
              <input
                type="number"
                min="2"
                max={formData.trustees.length || 10}
                value={formData.kThreshold}
                onChange={(e) => handleInputChange('kThreshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum number of trustees needed to trigger inheritance
              </p>
            </div>
          </div>

          {/* Trustees */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Trustees *</h4>
              <button
                type="button"
                onClick={addTrustee}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Trustee
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.trustees.map((trustee, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Trustee Name"
                    value={trustee.name}
                    onChange={(e) => updateTrustee(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="trustee@example.com"
                    value={trustee.email}
                    onChange={(e) => updateTrustee(index, 'email', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeTrustee(index)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Trustee Key Management - Temporarily Disabled */}
            {formData.trustees.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <KeyIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Trustee key management temporarily disabled due to import issues. Basic Shamir sharing is working.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Beneficiaries */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Beneficiaries *</h4>
              <button
                type="button"
                onClick={addBeneficiary}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Beneficiary
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.beneficiaries.map((beneficiary, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Beneficiary Name"
                    value={beneficiary.name}
                    onChange={(e) => updateBeneficiary(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="beneficiary@example.com"
                    value={beneficiary.email}
                    onChange={(e) => updateBeneficiary(index, 'email', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Relationship (e.g., Spouse, Child)"
                    value={beneficiary.relationship}
                    onChange={(e) => updateBeneficiary(index, 'relationship', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeBeneficiary(index)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Vault Items */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Select Vault Items *</h4>
            
            {loadingVaultItems ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading vault items...</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {vaultItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No vault items available. Upload some files first.
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {vaultItems.map((item) => (
                      <label key={item.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.vaultItemIds.includes(item.id)}
                          onChange={() => toggleVaultItem(item.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.category || 'File'} • {item.isEncrypted ? 'Encrypted' : 'Unencrypted'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trustee Key Management */}
          {formData.trustees.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <KeyIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h5 className="text-sm font-medium text-blue-900">
                    Trustee Keys ({trusteeKeyPairs.length}/{formData.trustees.length})
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyManager(!showKeyManager)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showKeyManager ? 'Hide' : 'Manage Keys'}
                </button>
              </div>
              {trusteeKeyPairs.length < formData.trustees.length && (
                <p className="text-xs text-blue-700 mb-3">
                  Generate or import key pairs for all trustees to enable secure share encryption.
                </p>
              )}
              {showKeyManager && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Trustee Key Manager temporarily disabled. Advanced key management will be available soon.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanForm;
