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

  useEffect(() => {
    console.log("data", data);
  }, [data]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content tool-info-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h4>Tool Interaction Details</h4>
        <div className="tool-info-section">
          <h5>Tool Calls (Sent to LLM)</h5>
          <pre className="tool-info-json">
            {JSON.stringify(data.calls, null, 2)}
          </pre>
        </div>
        <div className="tool-info-section">
          <h5>Tool Responses (Received from Tools)</h5>
          <pre className="tool-info-json">
            {JSON.stringify(data.responses, null, 2)}
          </pre>
        </div>
        <div className="modal-buttons">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ToolInfoModal;
