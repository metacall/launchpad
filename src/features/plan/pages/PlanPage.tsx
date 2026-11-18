import { useNavigate } from 'react-router-dom';
import { Plans } from '@metacall/protocol/plan';
import { ArrowLeft } from 'lucide-react';

export default function PlanPage() {
  const navigate = useNavigate();

  const plans = [
    {
      id: Plans.Essential,
      name: 'Essential Plan',
      price: '10',
      description: 'Ideal for prototyping and small projects.',
      color: 'bg-gradient-to-r from-slate-600 to-slate-400',
      borderColor: 'hover:border-slate-500',
      features: ['Unlimited Functions', 'Unlimited Builds', 'Medium Resources'],
    },
    {
      id: Plans.Standard,
      name: 'Standard Plan',
      price: '29.99',
      description: 'Perfect for going to production with small and medium sized projects.',
      color: 'bg-gradient-to-r from-blue-700 to-blue-500',
      borderColor: 'hover:border-blue-600',
      features: ['Unlimited Functions', 'Unlimited Builds', 'High Resources'],
    },
    {
      id: Plans.Premium,
      name: 'Premium Plan',
      price: '80',
      description: 'The most reliable plan for enterprise projects.',
      color: 'bg-gradient-to-r from-pink-600 to-purple-500',
      borderColor: 'hover:border-pink-600',
      features: [
        'Unlimited Functions',
        'Unlimited Builds',
        'Dedicated Resources',
        'Parallelization',
      ],
    },
  ];

  return (
    <div className="grow flex flex-col items-center justify-start p-4 sm:p-10 sm:pt-1 animate-in fade-in duration-500 relative">
      <div className="w-full max-w-5xl mt-6 relative">
        {/* Back / Close Button */}
        <div className="flex justify-end w-full mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-1 px-3 border border-slate-300 rounded hover:bg-slate-100 transition-colors bg-white flex items-center justify-center text-slate-800"
            title="Close Plans"
          >
            <ArrowLeft size={16} strokeWidth={2.5} className="mr-2" /> Back
          </button>
        </div>

        <div className="text-center mb-12 px-4">
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
            Select one of our subscription plans
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Scale effortlessly to millions of requests with MetaCall's FaaS.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 px-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`border border-slate-300 bg-white flex flex-col relative overflow-hidden group transition-colors w-full md:w-1/3 ${plan.borderColor}`}
            >
              {/* Colored Traingle Ribbon */}
              <div
                className={`absolute top-0 right-0 w-16 h-16 ${plan.color} transform translate-x-1/2 -translate-y-1/2 rotate-45`}
              ></div>

              <div className="p-8 pb-6 grow">
                <h3 className="text-[12px] font-bold text-slate-900 mb-6">{plan.name}</h3>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-bold text-slate-800 tracking-tight">
                    €{plan.price.split('.')[0]}
                    <span className="text-2xl align-top">{plan.price.split('.')[1] || ''}</span>
                  </span>
                  <span className="text-sm font-bold text-slate-500 mb-1">/MO</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-6 mt-1 text-center w-30">
                  per deploy
                </p>

                <p className="text-[13px] text-gray-600 mb-10 min-h-10 leading-relaxed">
                  {plan.description}
                </p>

                <ul className="flex flex-col gap-6 text-[13px] text-gray-600">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  disabled
                  className="w-full py-4 text-slate-500 font-bold text-[14px] rounded-sm bg-slate-100 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
