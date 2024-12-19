import React, { useState } from "react";
import "./ChatPanel.css"; // Ensure this file contains the modal styles

interface CallToActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (from: string) => void;
  defaultEmail?: string;
}

const CallToActionlModal: React.FC<CallToActionModalProps> = ({ isOpen, onClose, onSend, defaultEmail }) => {
  const [email, setEmail] = useState(defaultEmail || "");
  const [isEmailValid, setIsEmailValid] = useState(true);
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSend = () => {
    if (validateEmail(email)) {
      onSend(email);
      onClose();
    } else {
      setIsEmailValid(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="modal-text">
        Please enter your contact email

        </p>
        <p>
        <input
          type="email"
          width="100%"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setIsEmailValid(true); // Reset validation state on change
          }}
          placeholder="Your email address"
          className={!isEmailValid ? 'invalid' : ''}
        />
        {!isEmailValid && <p className="error-message">Please enter a valid email address.</p>}
        
        </p>
        <div className="modal-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSend}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export default CallToActionlModal;
