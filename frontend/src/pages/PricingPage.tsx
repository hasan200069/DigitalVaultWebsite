import React from 'react';
import { CheckIcon, CurrencyDollarIcon, SparklesIcon } from '@heroicons/react/24/outline';

const PricingPage: React.FC = () => {
  const allPlansFeatures = [
    'Fast Onboarding & Support',
    'Data & Document Migration',
    'Free Trial of All Features',
    '30-day money guarantee',
    'Unlimited cloud storage',
    'Unlimited Users'
  ];

  const organizeFeatures = [
    'Unlimited Cloud-based storage',
    '30-day money back guarantee',
    'Easy search',
    'Unlimited reminders & alerts',
    'Zero-knowledge encryption',
    'World-class security',
    'Multiple ways to upload',
    'Invite designees',
    'Custom dashboards & reports',
    'Custom user roles & permissions',
    '1-on-1 email consultation',
    'Highlights & comments',
    'Manage attachments',
    'Duplicate flagging',
    'Organize by tags, types, and folders',
    'Categorization',
    'Amendment tracking',
    'In-App editing',
    'Audit trail'
  ];

  const growFeatures = [
    'DocuSign integration',
    'Single Sign-on',
    'Redlining',
    'Approval sequences',
    'Functionality Commenting',
    'MS Word integration',
    'Automate workflow'
  ];

  const premiumFeatures = [
    'APIs',
    'Salesforce integration',
    'Intake forms',
    'Templates',
    'IP whitelisting',
    'White label',
    'Contract management'
  ];

  const annualPricing = [
    { volume: '100 or less', organize: 299, grow: 479, premium: 645 },
    { volume: '101-500', organize: 472, grow: 627, premium: 893 },
    { volume: '501-1,000', organize: 565, grow: 861, premium: 1009 },
    { volume: '1,001-2,500', organize: 657, grow: 979, premium: 1141 },
    { volume: '2,501-5,000', organize: 842, grow: 1121, premium: 1339 },
    { volume: '5,001-10,000', organize: 998, grow: 1231, premium: 1663 },
    { volume: 'Unlimited', organize: 1425, grow: 1845, premium: 2100 }
  ];

  const monthlyPricing = [
    { volume: '100 or less', organize: 343, grow: 550, premium: 714 },
    { volume: '101-500', organize: 542, grow: 721, premium: 1026 },
    { volume: '501-1,000', organize: 649, grow: 990, premium: 1160 },
    { volume: '1,001-2,500', organize: 755, grow: 1125, premium: 1312 },
    { volume: '2,501-5,000', organize: 968, grow: 1289, premium: 1539 },
    { volume: '5,001-10,000', organize: 1147, grow: 1415, premium: 1912 },
    { volume: 'Unlimited', organize: 1638, grow: 2121, premium: 2415 }
  ];

  const faqs = [
    {
      question: 'Do I need to pay for a year upfront?',
      answer: 'Not at all. You can pay month-to-month or choose an annual subscription with a discount when prepaid.'
    },
    {
      question: 'What is the charge per user?',
      answer: 'We do not charge per user! Pricing is based on how many documents you need to store and which features you use.'
    },
    {
      question: 'What is the implementation fee?',
      answer: 'Zero! There is no fee. All plans include assistance, data migration, onboarding training, and assistance.'
    },
    {
      question: 'Do you have storage limit?',
      answer: 'No, unlike other cloud storages, we offer unlimited cloud based storage for all plans, no hidden fees, no surprise storage fees.'
    },
    {
      question: 'What is the difference between Fortva and DropBox?',
      answer: 'Fortva offers better search (OCR for scans), easy reminders, summaries per document, simple sharing, and increased security. It delivers ease of use plus more features and protection, unlike shared drives.'
    },
    {
      question: 'Can I store my files locally?',
      answer: 'All documents are stored in the cloud (Amazon infrastructure) with high security. Local storage is not offered.'
    },
    {
      question: 'Does Fortva offer e-signatures?',
      answer: 'Yes. DocuSign integration is available.'
    },
    {
      question: 'How long is the free trial?',
      answer: '7 days with all features enabled.'
    },
    {
      question: 'Where can I see pricing plans?',
      answer: 'Pricing is available on the Fortva pricing page.'
    },
    {
      question: 'How do I invite a user to the account?',
      answer: 'Account Owners/Admins go to Settings > Users > Add Users. You can invite multiple at once and assign roles and permissions.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pricing</h1>
              <p className="mt-1 text-sm text-gray-600">Plans Built For Private Clients, Firms And Enterprises That Want Peace Of Mind With Document Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Call to Action Box */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-12 text-center shadow-sm">
          <div className="flex items-center justify-center mb-2">
            <SparklesIcon className="h-6 w-6 text-blue-600 mr-2" />
            <p className="text-lg font-semibold text-gray-900">
              If you are frustrated with{' '}
              <span className="text-purple-600">document management storage</span>{' '}
              signing up for Fortva is the right decision
            </p>
          </div>
        </div>

        {/* All Plans Include Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">All plans include:</h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {allPlansFeatures.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Tiers */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Choose Your Plan</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Organize Tier */}
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 rounded-lg p-3 mr-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Organize</h3>
                  <p className="text-sm text-gray-500">Essential Features</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Everything you need to organize your documents and life-planning into a single source of truth, plus:
              </p>
              <ul className="space-y-3 mb-8">
                {organizeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                Choose Organize
              </button>
            </div>

            {/* Grow Tier */}
            <div className="bg-white rounded-xl border-2 border-purple-300 shadow-lg hover:shadow-xl transition-shadow p-8 relative">
              <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <div className="flex items-center mb-6">
                <div className="bg-purple-100 rounded-lg p-3 mr-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Grow</h3>
                  <p className="text-sm text-gray-500">Advanced Features</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Able to edit, approve, compare, and sign documents for everyday document management. Everything in Organize, plus:
              </p>
              <ul className="space-y-3 mb-8">
                {growFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Choose Grow
              </button>
            </div>

            {/* Premium Tier */}
            <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg hover:shadow-xl transition-shadow p-8">
              <div className="flex items-center mb-6">
                <div className="bg-gray-100 rounded-lg p-3 mr-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
                  <p className="text-sm text-gray-500">Enterprise Features</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Manage the full document lifecycle with templates, intake forms, and robust integration options. Everything in Growth, plus:
              </p>
              <ul className="space-y-3 mb-8">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold">
                Choose Premium
              </button>
            </div>
          </div>
        </div>

        {/* Annual Pricing Table */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">Billed Annually (Extra Savings)</h3>
            <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">Save 15%</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Documents volume
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Organize
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Grow
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {annualPricing.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.volume}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.organize.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/year</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.grow.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/year</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.premium.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/year</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Monthly Pricing Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Monthly Plans Pricing</h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Documents volume
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Organize
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Growth
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyPricing.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.volume}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.organize.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/month</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.grow.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/month</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-900 font-semibold">${row.premium.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs block mt-1">/month</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pricing Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-16 shadow-sm">
          <div className="space-y-3">
            <p className="text-gray-900">
              <strong className="text-blue-900">Pricing model:</strong>{' '}
              <span className="text-gray-700">Monthly billed or choose an annually billed with a 15% discount when prepaid.</span>
            </p>
            <p className="text-gray-900">
              <strong className="text-blue-900">Currency:</strong>{' '}
              <span className="text-gray-700">USD, EUR, CAD, AUD, GBP, GHS. You can use currency switch based on where the buyer is accessing the site, they will automatically see price in local currency.</span>
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8">Frequently Asked Questions</h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {faqs.map((faq, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">Q{index + 1}.</span>
                    {faq.question}
                  </h4>
                  <p className="text-gray-700 ml-7">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
