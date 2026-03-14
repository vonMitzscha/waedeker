interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'muted';
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-[#700700]/10 text-[#700700] border-[#700700]/20',
    green: 'bg-[#6B8F3E]/10 text-[#6B8F3E] border-[#6B8F3E]/20',
    muted: 'bg-[#c4a882]/20 text-[#b89370] border-[#c4a882]/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
}
