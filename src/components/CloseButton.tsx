import { Icon } from './Icon';
import './CloseButton.css';

/** One recognisable, comfortably sized dismissal control across cards and dialogs. */
export function CloseButton({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  return <button type="button" className={`close-button ${className}`} aria-label={label} title={label} onClick={onClick}><Icon name="close" size={18}/></button>;
}
