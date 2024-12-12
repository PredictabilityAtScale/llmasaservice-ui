import React, { useState } from "react";
import "./ChatPanel.css"; // Ensure this file contains the modal styles

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, from: string) => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSend }) => {
  const [email, setEmail] = useState("");
  const [emailFrom, setEmailFrom] = useState("");

  const handleSend = () => {
    onSend(email, emailFrom);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="modal-text">
        Email Addresses
        <br /> (If multiple, comma separate them)
        </p>
        <p>
          <input
            type="email"
            width="100%"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="To email address"
          />
        </p>
        <p>
          <input
            type="email"
            width="100%"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder="From email address (optional)"
          />
        </p>
        <div className="modal-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
