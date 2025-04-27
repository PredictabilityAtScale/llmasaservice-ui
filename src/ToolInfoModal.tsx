import React, { useEffect } from "react";
import "./ChatPanel.css"; // Reuse styles or create specific ones

interface ToolInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { calls: any[]; responses: any[] } | null;
}

const ToolInfoModal: React.FC<ToolInfoModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content tool-info-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tool-info-container">
          <div className="tool-info-section">
            <b>Tool Calls</b>
            <textarea
              className="tool-info-json"
              readOnly
              value={JSON.stringify(data.calls, null, 2)}
            />
          </div>
          <div className="tool-info-section">
            <b>Tool Responses</b>
            <textarea
              className="tool-info-json"
              readOnly
              value={JSON.stringify(data.responses, null, 2)}
            />
          </div>
        </div>
        <div className="modal-buttons">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ToolInfoModal;
