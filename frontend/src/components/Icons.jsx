// React Icons for the authentication forms
import { 
    MdEmail, 
    MdLock, 
    MdVisibility, 
    MdVisibilityOff, 
    MdPerson,
    MdCheck,
    MdError
  } from 'react-icons/md';
  
  export const EmailIcon = () => (
    <MdEmail className="input-icon" size={20} />
  );
  
  export const PasswordIcon = () => (
    <MdLock className="input-icon" size={20} />
  );
  
  export const EyeIcon = () => (
    <MdVisibility size={20} />
  );
  
  export const EyeOffIcon = () => (
    <MdVisibilityOff size={20} />
  );
  
  export const UserIcon = () => (
    <MdPerson size={20} />
  );
  
  export const CheckIcon = () => (
    <MdCheck size={16} />
  );
  
  export const AlertIcon = () => (
    <MdError size={16} />
  );
  