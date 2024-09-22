import React, { useState, useEffect } from 'react';

interface ChatStatusProps {
  isLoading: boolean;
}

const ChatStatus: React.FC<ChatStatusProps> = ({ isLoading }) => {
  const [dots, setDots] = useState<string[]>(['', '', '']);
  const [dotIndex, setDotIndex] = useState<number>(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots((prevDots) => {
          const newDots = [...prevDots];
          newDots[dotIndex] = '.';
          setDotIndex((prevIndex) => (prevIndex + 1) % 3);
          return newDots;
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setDots(['', '', '']);
      setDotIndex(0);
    }
  }, [isLoading, dotIndex]);

  return (
    <div className="chat-status">
      {isLoading ? (
        <span className="loading-dots">
          {dots.join('')}
        </span>
      ) : null}
    </div>
  );
};

export default ChatStatus;