"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const llmasaservice_client_1 = require("llmasaservice-client");
const react_1 = __importStar(require("react"));
const react_markdown_1 = __importDefault(require("react-markdown"));
require("./ChatPanel.css");
const ChatPanel = ({ project_id, initialPrompt, title = "Chat", placeholder = "Type a message", hideInitialPrompt = true, customer = {}, messages = [], thumbsUpClick, thumbsDownClick, theme = "light" }) => {
    const { send, response, idle, stop } = (0, llmasaservice_client_1.useLLM)({
        project_id: project_id,
        customer: customer,
    });
    const [nextPrompt, setNextPrompt] = (0, react_1.useState)("");
    const [lastController, setLastController] = (0, react_1.useState)(new AbortController());
    const [history, setHistory] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [lastPrompt, setLastPrompt] = (0, react_1.useState)(null);
    const bottomRef = (0, react_1.useRef)(null);
    // response change. Update the history
    (0, react_1.useEffect)(() => {
        if (response && response.length > 0) {
            setIsLoading(false);
            setHistory((prevHistory) => {
                return Object.assign(Object.assign({}, prevHistory), { [lastPrompt !== null && lastPrompt !== void 0 ? lastPrompt : ""]: response });
            });
        }
    }, [response]);
    // initial prompt change. Reset the chat history and get this response
    (0, react_1.useEffect)(() => {
        if (initialPrompt && initialPrompt !== "") {
            if (initialPrompt !== lastPrompt) {
                setIsLoading(true);
                if (lastController)
                    stop(lastController);
                const controller = new AbortController();
                send(initialPrompt, [], true, controller);
                setLastPrompt(initialPrompt);
                setLastController(controller);
                setHistory({});
            }
        }
    }, [initialPrompt]);
    (0, react_1.useEffect)(() => {
        var _a;
        (_a = bottomRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
    }, [history]);
    const continueChat = () => {
        if (!idle) {
            stop(lastController);
            setHistory((prevHistory) => {
                return Object.assign(Object.assign({}, prevHistory), { [lastPrompt !== null && lastPrompt !== void 0 ? lastPrompt : ""]: response + "\n\n(response cancelled)" });
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
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
    }
    return (<>
      <div className={"side-panel" + (theme === "light" ? "" : "-dark")}>
        <div className="title">{title}</div>
        <div className="responseArea">
          {isLoading ? <div className="loading-text">loading...</div> : null}
          {Object.entries(history).map(([prompt, response], index) => (<div className="history-entry" key={index}>
              {hideInitialPrompt && index === 0 ? null : (<div className="prompt">{prompt}</div>)}
              <div className="response">
                <react_markdown_1.default>{response}</react_markdown_1.default>
                <button className="copy-button" onClick={() => copyToClipboard(response)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="currentColor">
                    <path d="M35,270h45v45c0,8.284,6.716,15,15,15h200c8.284,0,15-6.716,15-15V75c0-8.284-6.716-15-15-15h-45V15
		c0-8.284-6.716-15-15-15H35c-8.284,0-15,6.716-15,15v240C20,263.284,26.716,270,35,270z M280,300H110V90h170V300z M50,30h170v30H95
		c-8.284,0-15,6.716-15,15v165H50V30z"/>
                    <path d="M155,120c-8.284,0-15,6.716-15,15s6.716,15,15,15h80c8.284,0,15-6.716,15-15s-6.716-15-15-15H155z"/>
                    <path d="M235,180h-80c-8.284,0-15,6.716-15,15s6.716,15,15,15h80c8.284,0,15-6.716,15-15S243.284,180,235,180z"/>
                    <path d="M235,240h-80c-8.284,0-15,6.716-15,15c0,8.284,6.716,15,15,15h80c8.284,0,15-6.716,15-15C250,246.716,243.284,240,235,240z
		"/>
                  </svg>
                </button>

                {thumbsUpClick ? (<button className="thumbs-button" onClick={thumbsUpClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M20.22 9.55C19.79 9.04 19.17 8.75 18.5 8.75H14.47V6C14.47 4.48 13.24 3.25 11.64 3.25C10.94 3.25 10.31 3.67 10.03 4.32L7.49 10.25H5.62C4.31 10.25 3.25 11.31 3.25 12.62V18.39C3.25 19.69 4.32 20.75 5.62 20.75H17.18C18.27 20.75 19.2 19.97 19.39 18.89L20.71 11.39C20.82 10.73 20.64 10.06 20.21 9.55H20.22ZM5.62 19.25C5.14 19.25 4.75 18.86 4.75 18.39V12.62C4.75 12.14 5.14 11.75 5.62 11.75H7.23V19.25H5.62ZM17.92 18.63C17.86 18.99 17.55 19.25 17.18 19.25H8.74V11.15L11.41 4.9C11.45 4.81 11.54 4.74 11.73 4.74C12.42 4.74 12.97 5.3 12.97 5.99V10.24H18.5C18.73 10.24 18.93 10.33 19.07 10.5C19.21 10.67 19.27 10.89 19.23 11.12L17.91 18.62L17.92 18.63Z"/>
                    </svg>
                  </button>) : null}

                {thumbsDownClick ? (<button className="thumbs-button" onClick={thumbsDownClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18.38 3.25H6.81C5.72 3.25 4.79 4.03 4.6 5.11L3.29 12.61C3.18 13.27 3.36 13.94 3.78 14.45C4.21 14.96 4.83 15.25 5.5 15.25H9.53V18C9.53 19.52 10.76 20.75 12.36 20.75C13.06 20.75 13.69 20.33 13.97 19.68L16.51 13.75H18.39C19.7 13.75 20.76 12.69 20.76 11.38V5.61C20.76 4.31 19.7 3.25 18.39 3.25H18.38ZM15.26 12.85L12.59 19.1C12.55 19.19 12.46 19.26 12.27 19.26C11.58 19.26 11.03 18.7 11.03 18.01V13.76H5.5C5.27 13.76 5.07 13.67 4.93 13.5C4.78 13.33 4.73 13.11 4.77 12.88L6.08 5.38C6.14 5.02 6.45001 4.76 6.82 4.76H15.26V12.85ZM19.25 11.38C19.25 11.86 18.86 12.25 18.38 12.25H16.77V4.75H18.38C18.86 4.75 19.25 5.14 19.25 5.61V11.38Z"/>
                    </svg>
                  </button>) : null}
              </div>
            </div>))}
          <div ref={bottomRef}/>
        </div>

        <div className="input-container">
          <textarea placeholder={placeholder} value={nextPrompt} onChange={(e) => setNextPrompt(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                continueChat();
            }
        }}></textarea>
          <button className="send-button" onClick={continueChat}>
            {idle ? "Send" : "Stop"}
          </button>
        </div>
      </div>
    </>);
};
exports.default = ChatPanel;
