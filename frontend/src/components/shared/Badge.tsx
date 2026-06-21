interface BadgeProps {
  label: string;
  variant?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

export default function Badge({ label, variant = 'blue' }: BadgeProps) {
  const variants = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    orange:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]}`}
    >
      {label}
    </span>
  );
}