import { LLMAsAServiceCustomer, useLLM } from "llmasaservice-client";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./ChatPanel.css";

export interface ChatPanelProps {
  project_id: string;
  initialPrompt: string;
  title?: string;
  placeholder?: string;
  hideInitialPrompt?: boolean;
  customer?: LLMAsAServiceCustomer;
  messages?: { role: "user" | "assistant"; content: string }[];
  thumbsUpClick?: () => void;
  thumbsDownClick?: () => void;
  theme?: "light" | "dark";
  markdownClass?: string;
  width?: string;
  height?: string;
  url?: string | null;
  scrollToEnd?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  project_id,
  initialPrompt,
  title = "Chat",
  placeholder = "Type a message",
  hideInitialPrompt = true,
  customer = {} as LLMAsAServiceCustomer,
  messages = [],
  thumbsUpClick,
  thumbsDownClick,
  theme = "light",
  markdownClass = null,
  width = "300px",
  height = "100vh",
  url = null,
  scrollToEnd = false,
}) => {
  const { send, response, idle, stop } = useLLM({
    project_id: project_id,
    customer: customer,
    url: url,
  });

  const [nextPrompt, setNextPrompt] = useState("");
  const [lastController, setLastController] = useState(new AbortController());
  const [history, setHistory] = useState<{ [prompt: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const responseAreaRef = useRef(null);

  // response change. Update the history
  useEffect(() => {
    if (response && response.length > 0) {
      setIsLoading(false);

      setHistory((prevHistory) => {
        return {
          ...prevHistory,
          [lastPrompt ?? ""]: response,
        };
      });
    }
  }, [response]);

  function hasVerticalScrollbar(element: any) {
    return element.scrollHeight > element.clientHeight;
  }

  // initial prompt change. Reset the chat history and get this response
  useEffect(() => {
    if (initialPrompt && initialPrompt !== "") {
      if (initialPrompt !== lastPrompt) {
        setIsLoading(true);

        if (lastController) stop(lastController);
        const controller = new AbortController();

        send(initialPrompt, messages, true, controller);
        setLastPrompt(initialPrompt);
        setLastController(controller);
        setHistory({});
      }
    }
  }, [initialPrompt]);

  /*
  useEffect(() => {
    if (scrollToEnd) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (responseAreaRef.current) {
      setHasScroll(hasVerticalScrollbar(responseAreaRef.current));
    }
  }, [history]);
*/
  useEffect(() => {
    if (scrollToEnd) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      const responseArea = responseAreaRef.current as any;
      if (responseArea) {
        setHasScroll(hasVerticalScrollbar(responseArea));
        const handleScroll = () => {
          const isScrolledToBottom =
            responseArea.scrollHeight - responseArea.scrollTop ===
            responseArea.clientHeight;
          setIsAtBottom(isScrolledToBottom);
        };
        handleScroll();
        responseArea.addEventListener("scroll", handleScroll);
        return () => responseArea.removeEventListener("scroll", handleScroll);
      }
    }
  }, [response, history]);

  const continueChat = () => {
    if (!idle) {
      stop(lastController);

      setHistory((prevHistory) => {
        return {
          ...prevHistory,
          [lastPrompt ?? ""]: response + "\n\n(response cancelled)",
        };
      });

      return;
    }

    if (nextPrompt && nextPrompt !== "") {
      setIsLoading(true);

      // build the chat input from history
      const messagesAndHistory = messages;
      Object.entries(history).forEach(([prompt, response]) => {
        messagesAndHistory.push({ role: "user", content: prompt });
        messagesAndHistory.push({ role: "assistant", content: response });
      });

      const controller = new AbortController();
      send(nextPrompt, messagesAndHistory, true, controller);

      setLastPrompt(nextPrompt);
      setLastController(controller);
      setNextPrompt("");
    }
  };

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div
        style={{ width: width, height: height }}
        className={"side-panel" + (theme === "light" ? "" : "-dark")}
      >
        <div className="title">{title}</div>
        <div className="responseArea" ref={responseAreaRef}>
          {isLoading ? <div className="loading-text">loading...</div> : null}
          {Object.entries(history).map(([prompt, response], index) => (
            <div className="history-entry" key={index}>
              {hideInitialPrompt && index === 0 ? null : (
                <div className="prompt">{prompt}</div>
              )}
              <div className="response">
                <ReactMarkdown className={markdownClass}>
                  {response}
                </ReactMarkdown>
                <div className="button-container">
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(response)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 320 320"
                      fill="currentColor"
                      className="icon-svg"
                    >
                      <path
                        d="M35,270h45v45c0,8.284,6.716,15,15,15h200c8.284,0,15-6.716,15-15V75c0-8.284-6.716-15-15-15h-45V15
		c0-8.284-6.716-15-15-15H35c-8.284,0-15,6.716-15,15v240C20,263.284,26.716,270,35,270z M280,300H110V90h170V300z M50,30h170v30H95
		c-8.284,0-15,6.716-15,15v165H50V30z"
                      />
                      <path d="M155,120c-8.284,0-15,6.716-15,15s6.716,15,15,15h80c8.284,0,15-6.716,15-15s-6.716-15-15-15H155z" />
                      <path d="M235,180h-80c-8.284,0-15,6.716-15,15s6.716,15,15,15h80c8.284,0,15-6.716,15-15S243.284,180,235,180z" />
                      <path
                        d="M235,240h-80c-8.284,0-15,6.716-15,15c0,8.284,6.716,15,15,15h80c8.284,0,15-6.716,15-15C250,246.716,243.284,240,235,240z
		"
                      />
                    </svg>
                  </button>

                  {thumbsUpClick ? (
                    <button className="thumbs-button" onClick={thumbsUpClick}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="icon-svg"
                      >
                        <path d="M20.22 9.55C19.79 9.04 19.17 8.75 18.5 8.75H14.47V6C14.47 4.48 13.24 3.25 11.64 3.25C10.94 3.25 10.31 3.67 10.03 4.32L7.49 10.25H5.62C4.31 10.25 3.25 11.31 3.25 12.62V18.39C3.25 19.69 4.32 20.75 5.62 20.75H17.18C18.27 20.75 19.2 19.97 19.39 18.89L20.71 11.39C20.82 10.73 20.64 10.06 20.21 9.55H20.22ZM5.62 19.25C5.14 19.25 4.75 18.86 4.75 18.39V12.62C4.75 12.14 5.14 11.75 5.62 11.75H7.23V19.25H5.62ZM17.92 18.63C17.86 18.99 17.55 19.25 17.18 19.25H8.74V11.15L11.41 4.9C11.45 4.81 11.54 4.74 11.73 4.74C12.42 4.74 12.97 5.3 12.97 5.99V10.24H18.5C18.73 10.24 18.93 10.33 19.07 10.5C19.21 10.67 19.27 10.89 19.23 11.12L17.91 18.62L17.92 18.63Z" />
                      </svg>
                    </button>
                  ) : null}

                  {thumbsDownClick ? (
                    <button className="thumbs-button" onClick={thumbsDownClick}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="icon-svg"
                      >
                        <path d="M18.38 3.25H6.81C5.72 3.25 4.79 4.03 4.6 5.11L3.29 12.61C3.18 13.27 3.36 13.94 3.78 14.45C4.21 14.96 4.83 15.25 5.5 15.25H9.53V18C9.53 19.52 10.76 20.75 12.36 20.75C13.06 20.75 13.69 20.33 13.97 19.68L16.51 13.75H18.39C19.7 13.75 20.76 12.69 20.76 11.38V5.61C20.76 4.31 19.7 3.25 18.39 3.25H18.38ZM15.26 12.85L12.59 19.1C12.55 19.19 12.46 19.26 12.27 19.26C11.58 19.26 11.03 18.7 11.03 18.01V13.76H5.5C5.27 13.76 5.07 13.67 4.93 13.5C4.78 13.33 4.73 13.11 4.77 12.88L6.08 5.38C6.14 5.02 6.45001 4.76 6.82 4.76H15.26V12.85ZM19.25 11.38C19.25 11.86 18.86 12.25 18.38 12.25H16.77V4.75H18.38C18.86 4.75 19.25 5.14 19.25 5.61V11.38Z" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
          {hasScroll && !isAtBottom && (
            <button className="scroll-button" onClick={scrollToBottom}>
              ↓
            </button>
          )}
        </div>

        <div className="input-container">
          <textarea
            placeholder={placeholder}
            value={nextPrompt}
            onChange={(e) => setNextPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                continueChat();
              }
            }}
          ></textarea>
          <button className="send-button" onClick={continueChat}>
            {idle ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon-svg-large"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M10 14l11 -11"></path>
                <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1"
                stroke="currentColor"
                fill="currentColor"
                className="icon-svg-large"
              >
                <path d="M8 8h16v16H8z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
