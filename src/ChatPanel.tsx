import { LLMAsAServiceCustomer, useLLM } from "llmasaservice-client";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkHtml from "remark-html";
import rehypeRaw from "rehype-raw";
import "./ChatPanel.css";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import PrismStyle from "react-syntax-highlighter";
import materialDark from "react-syntax-highlighter/dist/cjs/styles/prism/material-dark.js";
import materialLight from "react-syntax-highlighter/dist/cjs/styles/prism/material-light.js";

export interface ChatPanelProps {
  project_id: string;
  initialPrompt?: string;
  initialMessage?: string;
  title?: string;
  placeholder?: string;
  hideInitialPrompt?: boolean;
  customer?: LLMAsAServiceCustomer;
  messages?: { role: "user" | "assistant"; content: string }[];
  data?: { key: string; data: string }[];
  thumbsUpClick?: () => void;
  thumbsDownClick?: () => void;
  theme?: "light" | "dark";
  markdownClass?: string;
  width?: string;
  height?: string;
  url?: string | null;
  scrollToEnd?: boolean;
  prismStyle?: PrismStyle;
  service?: string | null;
  historyChangedCallback?: (history: {
    [key: string]: { content: string; callId: string };
  }) => void;
  promptTemplate?: string;
  actions?: {
    pattern: string;
    type?: string;
    markdown?: string;
    callback?: (match: string) => void;
    clickCode?: string;
  }[];
}

interface ExtraProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps & ExtraProps> = ({
  project_id,
  initialPrompt = "",
  title = "Chat",
  placeholder = "Type a message",
  hideInitialPrompt = true,
  customer = {} as LLMAsAServiceCustomer,
  messages = [],
  data = [],
  thumbsUpClick,
  thumbsDownClick,
  theme = "light",
  markdownClass = null,
  width = "300px",
  height = "100vh",
  url = null,
  scrollToEnd = false,
  initialMessage = "",
  prismStyle = theme === "light" ? materialLight : materialDark,
  service = null,
  historyChangedCallback = null,
  promptTemplate = "",
  actions = [],
}) => {
  const { send, response, idle, stop, lastCallId } = useLLM({
    project_id: project_id,
    customer: customer,
    url: url,
  });

  const [nextPrompt, setNextPrompt] = useState("");
  const [lastController, setLastController] = useState(new AbortController());
  const [history, setHistory] = useState<{
    [prompt: string]: { content: string; callId: string };
  }>({});
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

      let newResponse = response;

      /*
    

[
  {
    "pattern": "any",
    "markdown": "[$match]($1)",
    "type": "markdown"
  },
  {
    "pattern": "the",
    "type": "button",
    "clickCode": "alert(match);"
  }
]

*/

      // replace actions with links
      if (actions && actions.length > 0) {
        actions.forEach((action, index) => {
          const regex = new RegExp(action.pattern, "gmi");
          newResponse = newResponse.replace(regex, (match, ...groups) => {
            
            console.log("match", match);
            console.log("groups", groups);

            const matchIndex = groups[groups.length - 2]; // The second-to-last argument is the match index

            const buttonId = `button-${index}-${matchIndex}`;

            let html = match;
            if (action.type === "button" || action.type === "callback") {
              const button = document.getElementById(buttonId);
              if (!button) {
                html = `<button id="${buttonId}">${match}</button>`;
              }
            } else if (action.type === "markdown") {
              html = action.markdown ?? "";
            }

            html = html.replace(new RegExp("\\$match", "g"), match);
            groups.forEach((group, index) => {
              html = html.replace(new RegExp(`\\$${index + 1}`, 'g'), group);
            });

            setTimeout(() => {
              const button = document.getElementById(buttonId);
              if (button) {
                if (!button.onclick) {
                  button.onclick = () => {
                    if (action.callback) {
                      action.callback(match);
                    }
                    if (action.clickCode) {
                      try {
                        const func = new Function("match", action.clickCode);
                        func(match);
                      } catch (error) {
                        console.error("Error executing clickCode:", error);
                      }
                    }
                  };
                }
              }
            }, 0);
            return html;
          });
        });
      }

      setHistory((prevHistory) => {
        return {
          ...prevHistory,
          [lastPrompt ?? ""]: { content: newResponse, callId: lastCallId },
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

        send(initialPrompt, messages, data, true, true, service, controller);
        setLastPrompt(initialPrompt);
        setLastController(controller);
        setHistory({});
      }
    }
  }, [initialPrompt]);

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

  useEffect(() => {
    if (historyChangedCallback) {
      historyChangedCallback(history);
    }
  }, [history, historyChangedCallback]);

  const continueChat = () => {
    if (!idle) {
      stop(lastController);

      setHistory((prevHistory) => {
        return {
          ...prevHistory,
          [lastPrompt ?? ""]: {
            content: response + "\n\n(response cancelled)",
            callId: lastCallId,
          },
        };
      });

      return;
    }

    if (nextPrompt && nextPrompt !== "") {
      setIsLoading(true);

      // build the chat input from history
      const messagesAndHistory = messages;
      Object.entries(history).forEach(([prompt, response]) => {
        let promptToSend = prompt;
        if (promptTemplate && promptTemplate !== "") {
          promptToSend = promptTemplate.replace("{{prompt}}", promptToSend);
          for (let i = 0; i < data.length; i++) {
            promptToSend = promptToSend.replace(
              "{{" + data[i]?.key + "}}",
              data[i]?.data ?? ""
            );
          }
        }

        messagesAndHistory.push({ role: "user", content: promptToSend });
        messagesAndHistory.push({
          role: "assistant",
          content: response.content,
        });
      });

      // set the history prompt with the about to be sent prompt
      setHistory((prevHistory) => {
        return {
          ...prevHistory,
          [nextPrompt ?? ""]: { content: "", callId: "" },
        };
      });

      let promptToSend = nextPrompt;

      // if this is the first user message, use the template. otherwise it is a follow-on question(s)

      if (
        (initialPrompt &&
          initialPrompt !== "" &&
          Object.keys(history).length === 1) ||
        ((!initialPrompt || initialPrompt === "") &&
          Object.keys(history).length === 0)
      ) {
        if (promptTemplate && promptTemplate !== "") {
          promptToSend = promptTemplate.replace("{{prompt}}", nextPrompt);
          for (let i = 0; i < data.length; i++) {
            promptToSend = promptToSend.replace(
              "{{" + data[i]?.key + "}}",
              data[i]?.data ?? ""
            );
          }
        }
      }

      const controller = new AbortController();
      send(
        promptToSend,
        messagesAndHistory,
        data,
        true,
        true,
        service,
        controller
      );

      setLastPrompt(nextPrompt);
      setLastController(controller);
      setNextPrompt("");
    }
  };

  const replaceHistory = (newHistory: {
    [prompt: string]: { content: string; callId: string };
  }) => {
    setHistory(newHistory);
  };

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const CodeBlock = ({ node, className, children, style, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");

    return match ? (
      <>
        <div
          style={{
            border: 0,
            padding: 0,
            height: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{match ? match[1] : "Unknown"}</span>
          <button
            onClick={() => copyToClipboard(children)}
            className="copy-button"
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
        </div>
        <SyntaxHighlighter
          style={prismStyle}
          PreTag="div"
          language={match[1]}
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </>
    ) : (
      <code className={className ? className : ""} {...props}>
        {children}
      </code>
    );
  };

  // links should always open in a new tab
  const CustomLink = ({ href, children, ...props }: any) => {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  };
 
  return (
    <>
      <div
        style={{ width: width, height: height }}
        className={"side-panel" + (theme === "light" ? "" : "-dark")}
      >
        <div className="title">{title}</div>
        <div className="responseArea" ref={responseAreaRef}>
          {initialMessage && initialMessage !== "" ? (
            <div className="history-entry">
              <div className="response">
                <ReactMarkdown
                  className={markdownClass}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {initialMessage}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}
          {Object.entries(history).map(([prompt, response], index) => (
            <div className="history-entry" key={index}>
              {hideInitialPrompt && index === 0 ? null : (
                <div className="prompt">{prompt}</div>
              )}

              <div className="response">
                {index === Object.keys(history).length - 1 && isLoading ? (
                  <div className="loading-text">loading...</div>
                ) : null}
                <ReactMarkdown
                  className={markdownClass}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{ /*a: CustomLink,*/ code: CodeBlock }}
                >
                  {response.content}
                </ReactMarkdown>
                <div className="button-container">
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(response.content)}
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
