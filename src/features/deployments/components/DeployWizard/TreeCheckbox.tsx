import { Check } from 'lucide-react';

export function TreeCheckbox({
  checked,
  partial,
  onClick,
}: {
  checked: boolean;
  partial?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center justify-center w-3.5 h-3.5 border rounded-sm cursor-pointer transition-colors ${
        checked
          ? 'bg-blue-500 border-blue-500 text-white'
          : partial
          ? 'bg-blue-500 border-blue-500 text-white opacity-80'
          : 'bg-white border-gray-300'
      }`}
    >
      {checked && !partial && <Check size={10} strokeWidth={3} />}
      {partial && !checked && <div className="w-2 h-0.5 bg-white" />}
    </div>
  );
}
