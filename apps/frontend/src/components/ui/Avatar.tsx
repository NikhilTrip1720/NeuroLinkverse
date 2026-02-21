import { getAvatarUrl, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, name, size = 'md', className, showBorder }: AvatarProps) {
  const avatarUrl = getAvatarUrl(src, name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 bg-primary-900',
        sizeClasses[size],
        showBorder && 'ring-2 ring-primary-500',
        className,
      )}
      role="img"
      aria-label={name}
    >
      <img
        src={avatarUrl}
        alt={name}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          target.nextElementSibling?.removeAttribute('hidden');
        }}
      />
      <span hidden className="h-full w-full flex items-center justify-center font-medium text-primary-300">
        {initials}
      </span>
    </div>
  );
}
