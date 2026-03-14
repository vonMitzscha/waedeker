'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors cursor-pointer select-none border';

    const variants = {
      primary:
        'bg-[#700700] text-[#F5EDE0] border-[#700700] hover:bg-[#5a0600] hover:border-[#5a0600]',
      secondary:
        'bg-transparent text-[#700700] border-[#c4a882] hover:bg-[#EDE0CE] hover:border-[#700700]',
      ghost:
        'bg-transparent text-[#700700] border-transparent hover:bg-[#EDE0CE] hover:border-[#c4a882]',
      danger:
        'bg-transparent text-red-700 border-red-300 hover:bg-red-50',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3.5',
    };

    const disabledClass = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '';

    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? {} : { scale: 0.97 }}
        className={`${base} ${variants[variant]} ${sizes[size]} ${disabledClass} ${className}`}
        disabled={disabled}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
