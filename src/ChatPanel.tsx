import { LLMAsAServiceCustomer, useLLM } from "llmasaservice-client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";

import ReactDOMServer from "react-dom/server";
import "./ChatPanel.css";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import PrismStyle from "react-syntax-highlighter";
import materialDark from "react-syntax-highlighter/dist/esm/styles/prism/material-dark.js";
import materialLight from "react-syntax-highlighter/dist/esm/styles/prism/material-light.js";
import EmailModal from "./EmailModal";
import ToolInfoModal from "./ToolInfoModal";

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
  thumbsUpClick?: (callId: string) => void;
  thumbsDownClick?: (callId: string) => void;
  theme?: "light" | "dark";
  cssUrl?: string;
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
  responseCompleteCallback?: (
    callId: string,
    prompt: string,
    response: string
  ) => void;
  promptTemplate?: string;
  actions?: {
    pattern: string;
    type?: string;
    markdown?: string;
    callback?: (match: string, groups: any[]) => void;
    clickCode?: string;
    style?: string;
  }[];
  showSaveButton?: boolean;
  showEmailButton?: boolean;
  followOnQuestions?: string[];
  clearFollowOnQuestionsNextPrompt?: boolean;
  followOnPrompt?: string;
  showPoweredBy?: boolean;
  agent?: string | null;
  conversation?: string | null;
  showCallToAction?: boolean;
  callToActionButtonText?: string;
  callToActionEmailAddress?: string;
  callToActionEmailSubject?: string;
  initialHistory?: {
    [prompt: string]: { content: string; callId: string };
  };
  hideRagContextInPrompt?: boolean;
  createConversationOnFirstChat?: boolean;
  customerEmailCaptureMode?: "HIDE" | "OPTIONAL" | "REQUIRED";
  customerEmailCapturePlaceholder?: string;
  mcpServers?: [];
}

interface HistoryEntry {
  content: string;
  callId: string;
  toolCalls?: [];
  toolResponses?: [];
}

interface ExtraProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps & ExtraProps> = ({
  project_id,
  initialPrompt = "",
  title = "",
  placeholder = "Type a message",
  hideInitialPrompt = true,
  customer = {},
  messages = [],
  data = [],
  thumbsUpClick,
  thumbsDownClick,
  theme = "light",
  cssUrl = "",
  markdownClass = null,
  width = "300px",
  height = "100vh",
  url = null,
  scrollToEnd = false,
  initialMessage = "",
  prismStyle = theme === "light" ? materialLight : materialDark,
  service = null,
  historyChangedCallback = null,
  responseCompleteCallback = null,
  promptTemplate = "",
  actions,
  showSaveButton = true,
  showEmailButton = true,
  followOnQuestions = [],
  clearFollowOnQuestionsNextPrompt = false,
  followOnPrompt = "",
  showPoweredBy = true,
  agent = null,
  conversation = null,
  showCallToAction = false,
  callToActionButtonText = "Submit",
  callToActionEmailAddress = "",
  callToActionEmailSubject = "Agent CTA submitted",
  initialHistory = {},
  hideRagContextInPrompt = true,
  createConversationOnFirstChat = true,
  customerEmailCaptureMode = "HIDE",
  customerEmailCapturePlaceholder = "Please enter your email...",
  mcpServers,
}) => {
  const isEmailAddress = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const [nextPrompt, setNextPrompt] = useState("");
  const [lastController, setLastController] = useState(new AbortController());
  const [lastMessages, setLastMessages] = useState<any[]>([]);
  const [history, setHistory] = useState<{ [prompt: string]: HistoryEntry }>(
    initialHistory
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const bottomPanelRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isToolInfoModalOpen, setIsToolInfoModalOpen] = useState(false);
  const [toolInfoData, setToolInfoData] = useState<{
    calls: any[];
    responses: any[];
  } | null>(null);

  const [currentConversation, setCurrentConversation] = useState<string | null>(
    conversation
  );
  const [emailInput, setEmailInput] = useState(
    (customer as LLMAsAServiceCustomer)?.customer_user_email ?? ""
  );
  const [emailInputSet, setEmailInputSet] = useState(
    isEmailAddress(emailInput)
  );
  const [emailValid, setEmailValid] = useState(true);
  const [showEmailPanel, setShowEmailPanel] = useState(
    customerEmailCaptureMode !== "HIDE"
  );
  const [callToActionSent, setCallToActionSent] = useState(false);
  const [CTAClickedButNoEmail, setCTAClickedButNoEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailClickedButNoEmail, setEmailClickedButNoEmail] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<LLMAsAServiceCustomer>(
    customer as LLMAsAServiceCustomer
  );
  const [allActions, setAllActions] = useState<
    {
      pattern: string;
      type?: string;
      markdown?: string;
      callback?: (match: string, groups: any[]) => void;
      clickCode?: string;
      style?: string;
      actionType?: string;
    }[]
  >([]);

  const [pendingToolRequests, setPendingToolRequests] = useState<
    {
      match: string;
      groups: any[];
      toolName: string;
    }[]
  >([]);

  const [followOnQuestionsState, setFollowOnQuestionsState] =
    useState(followOnQuestions);

  // new per‐tool approval state
  const [sessionApprovedTools, setSessionApprovedTools] = useState<string[]>(
    []
  );
  const [alwaysApprovedTools, setAlwaysApprovedTools] = useState<string[]>([]);

  // State for tracking thinking content and navigation
  const [thinkingBlocks, setThinkingBlocks] = useState<
    Array<{ type: "reasoning" | "searching"; content: string; index: number }>
  >([]);
  const [currentThinkingIndex, setCurrentThinkingIndex] = useState(0);

  // State for pending button attachments
  const [pendingButtonAttachments, setPendingButtonAttachments] = useState<
    Array<{
      buttonId: string;
      action: any;
      match: string;
      groups: any[];
    }>
  >([]);

  // Persistent button action registry for event delegation fallback
  const buttonActionRegistry = useRef<Map<string, { action: any; match: string; groups: any[] }>>(new Map());

  // load “always” approvals
  useEffect(() => {
    const stored = localStorage.getItem("alwaysApprovedTools");
    if (stored) setAlwaysApprovedTools(JSON.parse(stored));
  }, []);

  // persist “always” approvals
  useEffect(() => {
    localStorage.setItem(
      "alwaysApprovedTools",
      JSON.stringify(alwaysApprovedTools)
    );
  }, [alwaysApprovedTools]);

  useEffect(() => {
    if (followOnQuestions !== followOnQuestionsState) {
      setFollowOnQuestionsState(followOnQuestions);
    }
  }, [followOnQuestions]);

  // Cleanup button registry on unmount
  useEffect(() => {
    return () => {
      buttonActionRegistry.current.clear();
      console.log("[BUTTON DEBUG] Cleaned up button registry on component unmount");
    };
  }, []);

  // Periodic cleanup of orphaned registry entries
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const registryKeys = Array.from(buttonActionRegistry.current.keys());
      const orphanedKeys: string[] = [];
      
      registryKeys.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (!button) {
          orphanedKeys.push(buttonId);
          buttonActionRegistry.current.delete(buttonId);
        }
      });

      if (orphanedKeys.length > 0) {
        console.log("[BUTTON DEBUG] Cleaned up orphaned registry entries:", orphanedKeys);
      }
    }, 10000); // Cleanup every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const responseAreaRef = useRef(null);

  // Memoized regex patterns to avoid recreation on every render
  const THINKING_PATTERNS = useMemo(
    () => ({
      reasoning: /<reasoning>([\s\S]*?)<\/reasoning>/gi,
      searching: /<searching>([\s\S]*?)<\/searching>/gi,
    }),
    []
  );

  // Memoized regex instances for better performance
  const reasoningRegex = useMemo(
    () => new RegExp(THINKING_PATTERNS.reasoning.source, "gi"),
    [THINKING_PATTERNS.reasoning.source]
  );
  const searchingRegex = useMemo(
    () => new RegExp(THINKING_PATTERNS.searching.source, "gi"),
    [THINKING_PATTERNS.searching.source]
  );

  // Memoized content cleaning function
  const cleanContentForDisplay = useCallback((content: string): string => {
    let cleaned = content
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italics
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Limit length to keep UI clean
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 100) + "...";
    }

    return cleaned || "Thinking";
  }, []);

  // Optimized function to extract thinking blocks in order
  const processThinkingTags = useCallback(
    (
      text: string
    ): {
      cleanedText: string;
      thinkingBlocks: Array<{
        type: "reasoning" | "searching";
        content: string;
        index: number;
      }>;
      lastThinkingContent: string;
    } => {
      if (!text) {
        return {
          cleanedText: "",
          thinkingBlocks: [],
          lastThinkingContent: "Thinking",
        };
      }

      // Remove zero-width space characters from keepalive before processing
      // This prevents them from interfering with thinking block extraction
      const processedText = text.replace(/\u200B/g, "");

      const allMatches: Array<{
        content: string;
        index: number;
        type: "reasoning" | "searching";
      }> = [];

      // Reset regex state for fresh matching
      reasoningRegex.lastIndex = 0;
      searchingRegex.lastIndex = 0;

      // Process reasoning blocks
      let reasoningMatch;
      while ((reasoningMatch = reasoningRegex.exec(processedText)) !== null) {
        const content = reasoningMatch[1]?.trim();
        if (content) {
          allMatches.push({
            content,
            index: reasoningMatch.index,
            type: "reasoning",
          });
        }
      }

      // Process searching blocks
      let searchingMatch;
      while ((searchingMatch = searchingRegex.exec(processedText)) !== null) {
        const content = searchingMatch[1]?.trim();
        if (content) {
          allMatches.push({
            content,
            index: searchingMatch.index,
            type: "searching",
          });
        }
      }

      // Sort by index to preserve original order
      const thinkingBlocks = allMatches.sort((a, b) => a.index - b.index);

      // Clean the text by removing thinking tags
      let cleanedText = processedText
        .replace(THINKING_PATTERNS.reasoning, "")
        .replace(THINKING_PATTERNS.searching, "")
        .trim();

      // Get last thinking content
      let lastThinkingContent = "Thinking";
      if (thinkingBlocks.length > 0) {
        const lastBlock = thinkingBlocks[thinkingBlocks.length - 1];
        if (lastBlock?.content) {
          lastThinkingContent = cleanContentForDisplay(lastBlock.content);
        }
      }

      return {
        cleanedText,
        thinkingBlocks,
        lastThinkingContent,
      };
    },
    [
      THINKING_PATTERNS.reasoning,
      THINKING_PATTERNS.searching,
      reasoningRegex,
      searchingRegex,
      cleanContentForDisplay,
    ]
  );

  // Memoized render function for thinking blocks with navigation
  const renderThinkingBlocks = useCallback((): JSX.Element | null => {
    if (thinkingBlocks.length === 0) return null;

    const currentBlock = thinkingBlocks[currentThinkingIndex];
    if (!currentBlock) return null;

    const icon = currentBlock.type === "reasoning" ? "🤔" : "🔍";
    const baseTitle =
      currentBlock.type === "reasoning" ? "Reasoning" : "Searching";

    // Extract title from **[title]** at the beginning of content and strip formatting
    const extractTitleAndContent = (
      text: string
    ): { displayTitle: string; content: string } => {
      // Handle potential whitespace at the beginning and be more flexible with the pattern
      const trimmedText = text.trim();
      const titleMatch = trimmedText.match(/^\*\*\[(.*?)\]\*\*/);
      if (titleMatch) {
        const extractedTitle = titleMatch[1];
        // Remove the title pattern and any following whitespace/newlines
        const remainingContent = trimmedText
          .replace(/^\*\*\[.*?\]\*\*\s*\n?/, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .trim();
        return {
          displayTitle: `${baseTitle}: ${extractedTitle}`,
          content: remainingContent,
        };
      }
      // If no title found, just strip bold formatting
      return {
        displayTitle: baseTitle,
        content: trimmedText.replace(/\*\*(.*?)\*\*/g, "$1"),
      };
    };

    const { displayTitle, content } = extractTitleAndContent(
      currentBlock.content
    );

    return (
      <div className="thinking-block-container">
        <div className={`thinking-section ${currentBlock.type}-section`}>
          <div className="thinking-header">
            {icon} {displayTitle}
            {thinkingBlocks.length > 1 && (
              <div className="thinking-navigation">
                <button
                  onClick={() =>
                    setCurrentThinkingIndex(
                      Math.max(0, currentThinkingIndex - 1)
                    )
                  }
                  disabled={currentThinkingIndex === 0}
                  className="thinking-nav-btn"
                >
                  ←
                </button>
                <span className="thinking-counter">
                  {currentThinkingIndex + 1} / {thinkingBlocks.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentThinkingIndex(
                      Math.min(
                        thinkingBlocks.length - 1,
                        currentThinkingIndex + 1
                      )
                    )
                  }
                  disabled={currentThinkingIndex === thinkingBlocks.length - 1}
                  className="thinking-nav-btn"
                >
                  →
                </button>
              </div>
            )}
          </div>
          <div className="thinking-content">{content}</div>
        </div>
      </div>
    );
  }, [thinkingBlocks, currentThinkingIndex]);

  const getBrowserInfo = () => {
    try {
      return {
        currentTimeUTC: new Date().toISOString(),
        userTimezone:
          (typeof Intl !== "undefined" &&
            Intl.DateTimeFormat().resolvedOptions().timeZone) ||
          "unknown",
        userLanguage:
          (typeof navigator !== "undefined" &&
            (navigator.language || navigator.language)) ||
          "unknown",
      };
    } catch (e) {
      console.warn("Error getting browser info:", e);
      return {
        currentTimeUTC: new Date().toISOString(),
        userTimezone: "unknown",
        userLanguage: "unknown",
      };
    }
  };

  const browserInfo = useMemo(() => getBrowserInfo(), []);

  const dataWithExtras = () => {
    return [
      ...data,
      { key: "--customer_id", data: currentCustomer?.customer_id ?? "" },
      {
        key: "--customer_name",
        data: currentCustomer?.customer_name ?? "",
      },
      {
        key: "--customer_user_id",
        data: currentCustomer?.customer_user_id ?? "",
      },
      {
        key: "--customer_user_email",
        data: currentCustomer?.customer_user_email ?? "",
      },
      { key: "--email", data: emailInput ?? "" },
      { key: "--emailValid", data: emailValid ? "true" : "false" },
      {
        key: "--emailInputSet",
        data: emailInputSet ? "true" : "false",
      },
      {
        key: "--emailPanelShowing",
        data: showEmailPanel ? "true" : "false",
      },
      {
        key: "--callToActionSent",
        data: callToActionSent ? "true" : "false",
      },
      {
        key: "--CTAClickedButNoEmail",
        data: CTAClickedButNoEmail ? "true" : "false",
      },
      { key: "--emailSent", data: emailSent ? "true" : "false" },
      {
        key: "--emailClickedButNoEmail",
        data: emailClickedButNoEmail ? "true" : "false",
      },
      {
        key: "--currentTimeUTC",
        data: browserInfo?.currentTimeUTC,
      },
      { key: "--userTimezone", data: browserInfo?.userTimezone },
      { key: "--userLanguage", data: browserInfo?.userLanguage },
    ];
  };

  // public api url for dev and production
  let publicAPIUrl = "https://api.llmasaservice.io";
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "dev.llmasaservice.io"
  ) {
    publicAPIUrl = "https://8ftw8droff.execute-api.us-east-1.amazonaws.com/dev";
  }

  const [toolList, setToolList] = useState<any[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsFetchError, setToolsFetchError] = useState(false);

  // mcp servers are passed in in the mcpServers prop. Fetch tools for each one.
  useEffect(() => {
    console.log("MCP servers", mcpServers);

    const fetchAndSetTools = async () => {
      if (!mcpServers || mcpServers.length === 0) {
        setToolList([]);
        setToolsLoading(false);
        setToolsFetchError(false);
        return;
      }

      setToolsLoading(true);
      setToolsFetchError(false);

      try {
        // Create an array of promises, one for each fetch call
        const fetchPromises = (mcpServers ?? []).map(async (m: any) => {
          const urlToFetch = `${publicAPIUrl}/tools/${encodeURIComponent(
            m.url
          )}`;
          console.log(`Fetching tools from: ${urlToFetch}`);
          try {
            const response = await fetch(urlToFetch);
            if (!response.ok) {
              console.error(
                `Error fetching tools from ${m.url}: ${response.status} ${response.statusText}`
              );
              const errorBody = await response.text();
              console.error(`Error body: ${errorBody}`);
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            const toolsFromServer = await response.json();
            if (Array.isArray(toolsFromServer)) {
              return toolsFromServer.map((tool) => ({
                ...tool,
                url: m.url,
                accessToken: m.accessToken || "",
                headers: {},
              }));
            } else {
              return [];
            }
          } catch (fetchError) {
            console.error(
              `Network or parsing error fetching tools from ${m.url}:`,
              fetchError
            );
            throw fetchError; // Re-throw to be caught by outer try-catch
          }
        });

        // Wait for all fetch calls to complete
        const results = await Promise.all(fetchPromises);

        const allTools = results.flat();

        console.log("Merged tools from all servers:", allTools);
        setToolList(allTools);
        setToolsFetchError(false);
      } catch (error) {
        console.error(
          "An error occurred while processing tool fetches:",
          error
        );
        setToolList([]); // Clear tools on overall error
        setToolsFetchError(true);
      } finally {
        setToolsLoading(false);
      }
    };

    fetchAndSetTools();
  }, [mcpServers, publicAPIUrl]);

  const { send, response, idle, stop, lastCallId } = useLLM({
    project_id: project_id,
    customer: currentCustomer,
    url: url,
    agent: agent,
    tools: toolList.map((item) => {
      // remove the url from the tool list
      return {
        name: item.name,
        description: item.description,
        parameters: item.parameters,
      };
    }) as [],
  });

  // Add logging for streaming states
  useEffect(() => {
    console.log("Streaming state changed:", {
      isLoading,
      idle,
      responseLength: response?.length || 0,
      lastCallId,
      hasResponse: !!response,
      timestamp: new Date().toISOString(),
    });
  }, [isLoading, idle, response, lastCallId]);

  useEffect(() => {
    setShowEmailPanel(customerEmailCaptureMode !== "HIDE");

    if (customerEmailCaptureMode === "REQUIRED") {
      if (!isEmailAddress(emailInput)) {
        setEmailValid(false);
      }
    }
  }, [customerEmailCaptureMode]);

  useEffect(() => {
    // do any response actions
    if (lastCallId && lastCallId !== "" && idle && response) {
      allActions
        .filter((a) => a.type === "response")
        .forEach((action) => {
          if (action.type === "response" && action.pattern) {
            const regex = new RegExp(action.pattern, "gi");
            const matches = regex.exec(response);
            console.log(
              "action match",
              matches,
              action.pattern,
              action.callback
            );
            if (matches && action.callback) {
              action.callback(matches[0], matches.slice(1));
            }
          }
        });
    }

    // call the connected responseCompleteCallback
    if (responseCompleteCallback) {
      if (lastCallId && lastCallId !== "" && idle)
        responseCompleteCallback(lastCallId, lastPrompt ?? "", response);
    }
  }, [idle]);

  useEffect(() => {
    if (Object.keys(initialHistory).length === 0) return;
    setHistory(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    if (!conversation || conversation === "") return;
    setCurrentConversation(conversation);
    setHistory(initialHistory);
  }, [conversation]);

  useEffect(() => {
    // Clean up any previously added CSS from this component
    const existingLinks = document.querySelectorAll(
      'link[data-source="llmasaservice-ui"]'
    );
    existingLinks.forEach((link) => link.parentNode?.removeChild(link));

    const existingStyles = document.querySelectorAll(
      'style[data-source="llmasaservice-ui"]'
    );
    existingStyles.forEach((style) => style.parentNode?.removeChild(style));

    if (cssUrl) {
      if (cssUrl.startsWith("http://") || cssUrl.startsWith("https://")) {
        // If it's a URL, create a link element
        const link = document.createElement("link");
        link.href = cssUrl;
        link.rel = "stylesheet";
        // Add a data attribute to identify and remove this link later if needed
        link.setAttribute("data-source", "llmasaservice-ui");
        document.head.appendChild(link);
        console.log("Added CSS link", link);
      } else {
        // If it's a CSS string, create a style element
        const style = document.createElement("style");
        style.textContent = cssUrl;
        // Add a data attribute to identify and remove this style later if needed
        style.setAttribute("data-source", "llmasaservice-ui");
        document.head.appendChild(style);
        console.log("Added inline CSS");
      }
    }

    // Clean up when component unmounts
    return () => {
      const links = document.querySelectorAll(
        'link[data-source="llmasaservice-ui"]'
      );
      links.forEach((link) => link.parentNode?.removeChild(link));

      const styles = document.querySelectorAll(
        'style[data-source="llmasaservice-ui"]'
      );
      styles.forEach((style) => style.parentNode?.removeChild(style));
    };
  }, [cssUrl]);

  const extractValue = (
    match: string,
    groups: any[] = [],
    extraArgs: string[] = []
  ): string => {
    // Rule 1: If there are no extraArgs and no groups, use match.
    if (
      (!extraArgs || extraArgs.length === 0) &&
      (!groups || groups.length === 0)
    ) {
      return match;
    }
    // Rule 2: If there are no extraArgs but groups exist, use groups[0].
    if ((!extraArgs || extraArgs.length === 0) && groups && groups.length > 0) {
      return groups[0];
    }
    // Rule 3: If there are extraArgs, use the first one as a template.
    if (extraArgs && extraArgs.length > 0) {
      const template = extraArgs[0] ?? "";
      return template.replace(/\$(\d+)/g, (_, index) => {
        const i = parseInt(index, 10);
        return groups[i] !== undefined ? groups[i] : "";
      });
    }
    return "";
  };

  const openUrlActionCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      const url = extractValue(match, groups, extraArgs);
      if (url?.startsWith("http") || url?.startsWith("mailto")) {
        window.open(url, "_blank");
      }
    },
    []
  );

  const copyToClipboardCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      const val = extractValue(match, groups, extraArgs);
      navigator.clipboard.writeText(val);
    },
    []
  );

  const showAlertCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      alert(extractValue(match, groups, extraArgs));
    },
    []
  );

  const sendFollowOnPromptCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      const val = extractValue(match, groups, extraArgs);
      if (val && val !== followOnPrompt) {
        continueChat(val);
      }
    },
    [followOnPrompt]
  );

  const setFollowUpQuestionsCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      const val = extractValue(match, groups, extraArgs).split("|");
      setFollowOnQuestionsState(val);
    },
    [followOnQuestions]
  );

  const openIframeCallback = useCallback(
    (match: string, groups: any[], ...extraArgs: string[]) => {
      const url = extractValue(match, groups, extraArgs);
      if (url?.startsWith("http")) {
        setIframeUrl(url);
      }
    },
    []
  );

  const anthropic_toolAction = {
    pattern:
      '\\{"type":"tool_use","id":"([^"]+)","name":"([^"]+)","input":(\\{[\\s\\S]+?\\}),"service":"([^"]+)"\\}',
    type: "markdown",
    markdown: "<br />*Tool use requested: $2*",
    actionType: "tool",
  };

  const openAI_toolAction = {
    pattern:
      '\\{"id":"([^"]+)","type":"function","function":\\{"name":"([^"]+)","arguments":"((?:\\\\.|[^"\\\\])*)"\\},"service":"([^"]+)"\\}',
    type: "markdown",
    markdown: "<br />*Tool use requested: $2*",
    actionType: "tool",
  };

  // google doesn't return an id, so we just grab functioCall
  const google_toolAction = {
    pattern:
      '^\\{\\s*"(functionCall)"\\s*:\\s*\\{\\s*"name"\\s*:\\s*"([^"]+)"\\s*,\\s*"args"\\s*:\\s*(\\{[\\s\\S]+?\\})\\s*\\}(?:\\s*,\\s*"thoughtSignature"\\s*:\\s*"[^"]*")?\\s*,\\s*"service"\\s*:\\s*"([^"]+)"\\s*\\}$',
    type: "markdown",
    markdown: "<br />*Tool use requested: $2*",
    actionType: "tool",
  };

  type ActionCallback = (
    match: string,
    groups: any[],
    ...extraArgs: string[]
  ) => void;

  const callbackMapping: Record<string, ActionCallback> = useMemo(
    () => ({
      openUrlActionCallback,
      copyToClipboardCallback,
      showAlertCallback,
      sendFollowOnPromptCallback,
      setFollowUpQuestionsCallback,
      openIframeCallback,
    }),
    [
      openUrlActionCallback,
      copyToClipboardCallback,
      showAlertCallback,
      sendFollowOnPromptCallback,
      setFollowUpQuestionsCallback,
      openIframeCallback,
    ]
  );
  const parseCallbackString = (callbackStr: string) => {
    const regex = /^(\w+)(?:\((.+)\))?$/;
    const match = callbackStr.match(regex);
    if (match) {
      const name = match[1];
      // If there are args, split by comma and trim whitespace.
      const args = match[2] ? match[2].split(",").map((arg) => arg.trim()) : [];
      return { name, args };
    }
    return null;
  };

  const getActionsArraySafely = (actionsString: string) => {
    let actions: any[] = [];
    if (actionsString && actionsString !== "") {
      try {
        actions = JSON.parse(actionsString);
        if (!Array.isArray(actions)) {
          throw new Error("Parsed actions is not an array");
        }
        // Map string callbacks to actual functions using callbackMapping and parsing args if needed
        actions = actions
          .map((action) => {
            if (typeof action.callback === "string") {
              const parsed = parseCallbackString(action.callback);
              if (parsed && parsed.name && callbackMapping[parsed.name]) {
                // Wrap the callback so that it receives the original match & groups plus extra args
                const mappedCallback = callbackMapping[parsed.name];
                if (mappedCallback) {
                  return {
                    ...action,
                    callback: (match: string, groups: any[]) =>
                      mappedCallback(match, groups, ...parsed.args),
                  };
                }
              } else {
                console.warn("Invalid or missing callback in action:", action);
                // Optionally provide a no-op fallback or skip the action:
                return null;
              }
            } else {
              return action;
            }
          })
          .filter(Boolean); // removes null entries
      } catch (error) {
        console.error("Error parsing actions string:", error);
        actions = [];
      }
    }
    return actions;
  };

  useEffect(() => {
    const actionsString =
      typeof actions === "string" ? actions : JSON.stringify(actions);
    setAllActions([
      ...getActionsArraySafely(actionsString),
      anthropic_toolAction,
      openAI_toolAction,
      google_toolAction,
    ]);
  }, [actions]);

  const pendingToolRequestsRef = useRef(pendingToolRequests);

  useEffect(() => {
    pendingToolRequestsRef.current = pendingToolRequests;
  }, [pendingToolRequests]);

  const processGivenToolRequests = async (
    requests: typeof pendingToolRequests
  ) => {
    if (!requests || requests.length === 0)
      requests = pendingToolRequestsRef.current;

    if (requests.length === 0) return;

    console.log("processGivenToolRequests", requests);
    setIsLoading(true);

    const toolsToProcess = [...requests];
    setPendingToolRequests([]);
    try {
      // Start with base messages including the user's original question
      const newMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: lastKey,
            },
          ],
        },
      ];

      // Add a single assistant message with ALL tool calls
      const toolCallsMessage = {
        role: "assistant",
        content: [],
        tool_calls: [],
      };

      // Parse all tool calls first
      const toolCallsPromises = toolsToProcess.map(async (req) => {
        if (!req) return null;

        try {
          return {
            req,
            parsedToolCall: JSON.parse(req.match),
          };
        } catch (e) {
          console.error("Failed to parse tool call:", e);
          return null;
        }
      });

      // Wait for all tool calls to be parsed
      const parsedToolCalls = await Promise.all(toolCallsPromises);

      // Add all tool calls to the assistant message
      parsedToolCalls.forEach((item) => {
        if (item && item.parsedToolCall) {
          (toolCallsMessage.tool_calls as any[]).push(item.parsedToolCall);
        }
      });

      // Add the assistant message with all tool calls
      newMessages.push(toolCallsMessage);

      const finalToolCalls = toolCallsMessage.tool_calls;

      const toolResponsePromises = parsedToolCalls.map(async (item) => {
        if (!item || !item.req) return null;

        const req = item.req;
        console.log(`Processing tool ${req.toolName}`);

        const mcpTool = toolList.find((tool) => tool.name === req.toolName);

        if (!mcpTool) {
          console.error(`Tool ${req.toolName} not found in tool list`);
          return null;
        }

        try {
          let args;
          try {
            args = JSON.parse(req.groups[2]);
          } catch (e) {
            try {
              args = JSON.parse(req.groups[2].replace(/\\"/g, '"'));
            } catch (err) {
              console.error("Failed to parse tool arguments:", err);
              return null;
            }
          }

          const body = {
            tool: req.groups[1],
            args: args,
          };

          const result = await fetch(
            `${publicAPIUrl}/tools/${encodeURIComponent(mcpTool.url)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-mcp-access-token":
                  mcpTool.accessToken && mcpTool.accessToken !== ""
                    ? mcpTool.accessToken
                    : "",
                "x-project-id": project_id,
              },
              body: JSON.stringify(body),
            }
          );

          if (!result.ok) {
            console.error(
              `Error calling tool ${req.toolName}: ${result.status} ${result.statusText}`
            );
            const errorBody = await result.text();
            console.error(`Error body: ${errorBody}`);
            return null;
          }

          let resultData;
          try {
            resultData = await result.json();
          } catch (jsonError) {
            console.error(
              `Error parsing JSON response for tool ${req.toolName}:`,
              jsonError
            );
            // Attempt to read as text for debugging if JSON fails
            try {
              const textBody = await result.text(); // Note: This consumes the body if json() failed early
              console.error("Response body (text):", textBody);
            } catch (textError) {
              console.error(
                "Failed to read response body as text either:",
                textError
              );
            }
            return null; // Exit if JSON parsing failed
          }

          //console.log("tool result data", resultData);
          if (
            resultData &&
            resultData.content &&
            resultData.content.length > 0
          ) {
            const textResult = resultData.content[0]?.text;
            return {
              role: "tool",
              content: [
                {
                  type: "text",
                  text: textResult,
                },
              ],
              tool_call_id: req.groups[0],
            };
          } else {
            console.error(`No content returned from tool ${req.toolName}`);
            return null;
          }
        } catch (error) {
          console.error(`Error processing tool ${req.toolName}:`, error);
          return null;
        }
      });

      // Wait for all tool responses
      const toolResponses = await Promise.all(toolResponsePromises);
      const finalToolResponses = toolResponses.filter(Boolean); // Filter out null

      if (lastKey) {
        setHistory((prev) => {
          const existingEntry = prev[lastKey] || {};

          return {
            ...prev,
            [lastKey]: {
              ...existingEntry,
              toolCalls: [
                ...((existingEntry as any).toolCalls || []),
                ...finalToolCalls,
              ],
              toolResponses: [
                ...((existingEntry as any).toolResponses || []),
                ...finalToolResponses,
              ],
            },
          } as any;
        });
      }

      finalToolResponses.forEach((response) => {
        if (response) {
          newMessages.push(response);
        }
      });

      //console.log("Sending final messages with all tool results:", newMessages);

      send(
        "",
        newMessages as any,
        [
          ...dataWithExtras(),
          {
            key: "--messages",
            data: newMessages.length.toString(),
          },
        ],
        true,
        true,
        service,
        currentConversation,
        lastController
      );
    } catch (error) {
      console.error("Error in processing all tools:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (response && response.length > 0) {
      console.log("Response updated:", {
        length: response.length,
        isLoading,
        idle,
        hasReasoningTags: response.includes("<reasoning>"),
        hasSearchingTags: response.includes("<searching>"),
        preview: response.substring(0, 200) + "...",
      });

      setIsLoading(false);

      // Step 1: Detect tool requests from the original response BEFORE any cleaning
      const toolRequests: { match: string; groups: any[]; toolName: string }[] =
        [];

      if (allActions && allActions.length > 0) {
        allActions
          .filter((a) => a.actionType === "tool")
          .forEach((action) => {
            const regex = new RegExp(action.pattern, "gmi");
            let match;
            // Use original response for tool detection
            while ((match = regex.exec(response)) !== null) {
              toolRequests.push({
                match: match[0],
                groups: Array.from(match).slice(1),
                toolName: match[2] ?? "tool", // Tool name should always in the 2nd capture group
              });
            }
          });
      }

      // Set tool requests immediately after detection
      if (toolRequests.length > 0) {
        console.log("toolRequests", toolRequests);
        setPendingToolRequests(toolRequests);
      } else {
        setPendingToolRequests([]);
      }

      // Step 2: Remove tool JSON patterns from response for display
      let responseWithoutTools = response;
      if (allActions && allActions.length > 0) {
        allActions
          .filter((a) => a.actionType === "tool")
          .forEach((action) => {
            const regex = new RegExp(action.pattern, "gmi");
            responseWithoutTools = responseWithoutTools.replace(regex, "");
          });
      }

      // Step 3: Process thinking tags on the response without tool JSON
      const { cleanedText, thinkingBlocks: newThinkingBlocks } =
        processThinkingTags(responseWithoutTools);

      // Replace the blocks entirely (don't append) to avoid duplicates during streaming
      setThinkingBlocks(newThinkingBlocks);
      // Always show the latest (last) thinking block
      setCurrentThinkingIndex(Math.max(0, newThinkingBlocks.length - 1));

      // Step 4: Process other non-tool actions on the cleaned response
      let newResponse = cleanedText;

      console.log("[BUTTON DEBUG] Starting action processing:", {
        actionsCount: allActions?.length || 0,
        nonToolActions:
          allActions?.filter(
            (a) => a.type !== "response" && a.actionType !== "tool"
          ).length || 0,
        cleanedTextLength: cleanedText.length,
        messagesLength: messages.length,
      });

      if (allActions && allActions.length > 0) {
        allActions
          .filter((a) => a.type !== "response" && a.actionType !== "tool")
          .forEach((action, index) => {
            const regex = new RegExp(action.pattern, "gmi");
            newResponse = newResponse.replace(regex, (match, ...groups) => {
              console.log("action match", match, groups);

              const matchIndex = groups[groups.length - 2];
              const buttonId = `button-${messages.length}-${index}-${matchIndex}`;

              let html = match;
              if (action.type === "button" || action.type === "callback") {
                html = `<br /><button id="${buttonId}" ${
                  action.style ? 'class="' + action.style + '"' : ""
                }>
              ${action.markdown ?? match}
            </button>`;

                console.log("[BUTTON DEBUG] Generated button HTML:", {
                  buttonId,
                  html: html.substring(0, 200) + "...",
                  actionType: action.type,
                });
              } else if (action.type === "markdown" || action.type === "html") {
                html = action.markdown ?? "";
              }

              html = html.replace(new RegExp("\\$match", "gmi"), match);
              groups.forEach((group, index) => {
                html = html.replace(
                  new RegExp(`\\$${index + 1}`, "gmi"),
                  group
                );
              });

              // Store the button context for later attachment
              const buttonContext = {
                buttonId,
                action,
                match,
                groups,
              };

              // Add debug logging for button creation
              console.log("[BUTTON DEBUG] Button created:", {
                buttonId,
                actionType: action.type,
                actionPattern: action.pattern,
                hasCallback: !!action.callback,
                hasClickCode: !!action.clickCode,
                match,
                groups,
              });

              // Add this to state to track pending button attachments
              setPendingButtonAttachments((prev) => [...prev, buttonContext]);

              return html;
            });
          });
      }

      // Store the cleaned response (without reasoning/searching tags and without tool JSON)
      console.log("Storing cleaned response to history:", {
        originalLength: response.length,
        cleanedLength: newResponse.length,
        hasReasoningTags: response.includes("<reasoning>"),
        hasSearchingTags: response.includes("<searching>"),
        preview: newResponse.substring(0, 200) + "...",
      });

      setHistory((prevHistory) => {
        // Get any existing tool data from the previous state
        const existingEntry = prevHistory[lastKey ?? ""] || {
          content: "",
          callId: "",
        };

        const updatedHistory = {
          ...prevHistory,
          [lastKey ?? ""]: {
            ...existingEntry, // This preserves toolCalls and toolResponses
            content: newResponse, // Store cleaned response without thinking tags or tool JSON
            callId: lastCallId,
          },
        };

        console.log("[BUTTON DEBUG] History updated with content:", {
          key: lastKey,
          contentLength: newResponse.length,
          contentPreview: newResponse.substring(0, 300) + "...",
          hasButtonTags: newResponse.includes("<button"),
          buttonMatches: (newResponse.match(/<button[^>]*>/g) || []).length,
        });

        return updatedHistory;
      });
    }
  }, [
    response,
    allActions,
    lastKey,
    lastCallId,
    messages.length,
    lastPrompt,
    lastMessages,
    initialPrompt,
    processThinkingTags,
  ]);

  // More reliable button attachment with retry mechanism and MutationObserver
  const attachButtonHandlers = useCallback((
    attachments: Array<{
      buttonId: string;
      action: any;
      match: string;
      groups: any[];
    }>,
    retryCount = 0
  ) => {
    if (attachments.length === 0) return;

    console.log("[BUTTON DEBUG] Starting button attachment process:", {
      pendingCount: attachments.length,
      retryCount,
      pendingButtons: attachments.map((b) => ({
        buttonId: b.buttonId,
        actionType: b.action.type,
        hasCallback: !!b.action.callback,
        hasClickCode: !!b.action.clickCode,
      })),
    });

    let attachedCount = 0;
    let notFoundCount = 0;
    let alreadyAttachedCount = 0;
    const stillPending: typeof attachments = [];

    // First, let's see what buttons actually exist in the DOM
    const allButtonsInDOM = document.querySelectorAll("button");
    const buttonIdsInDOM = Array.from(allButtonsInDOM)
      .map((btn) => btn.id)
      .filter((id) => id);

    console.log("[BUTTON DEBUG] DOM state before attachment:", {
      totalButtonsInDOM: allButtonsInDOM.length,
      buttonIdsInDOM,
      pendingButtonIds: attachments.map((b) => b.buttonId),
      documentReady: document.readyState,
      retryCount,
    });

    attachments.forEach(({ buttonId, action, match, groups }) => {
      const button = document.getElementById(buttonId) as HTMLButtonElement;

      console.log("[BUTTON DEBUG] Processing button:", {
        buttonId,
        buttonExists: !!button,
        hasExistingOnclick: button ? !!button.onclick : false,
        actionType: action.type,
        buttonInnerHTML: button ? button.innerHTML : "N/A",
        buttonParent: button ? button.parentElement?.tagName : "N/A",
        retryCount,
      });

      if (button) {
        if (!button.onclick) {
          button.onclick = () => {
            console.log("[BUTTON DEBUG] Button clicked:", {
              buttonId,
              actionType: action.type,
              hasCallback: !!action.callback,
              hasClickCode: !!action.clickCode,
              match,
              groups,
            });

            if (action.callback) {
              console.log(
                "[BUTTON DEBUG] Executing callback for:",
                buttonId
              );
              action.callback(match, groups);
            }

            if (action.clickCode) {
              try {
                console.log(
                  "[BUTTON DEBUG] Executing clickCode for:",
                  buttonId
                );
                const func = new Function("match", action.clickCode);
                func(match);
                // Note: interactionClicked will be available when this closure executes
                if (typeof interactionClicked === 'function') {
                  interactionClicked(lastCallId, "action");
                }
              } catch (error) {
                console.error(
                  "[BUTTON DEBUG] Error executing clickCode:",
                  error
                );
              }
            }
          };
          attachedCount++;
          console.log(
            "[BUTTON DEBUG] Successfully attached click handler to:",
            buttonId
          );
        } else {
          alreadyAttachedCount++;
          console.log(
            "[BUTTON DEBUG] Button already has click handler:",
            buttonId
          );
        }
      } else {
        notFoundCount++;
        stillPending.push({ buttonId, action, match, groups });
        // Only register in fallback for buttons that failed direct attachment
        buttonActionRegistry.current.set(buttonId, { action, match, groups });
        console.log("[BUTTON DEBUG] Button not found in DOM, registered for fallback:", buttonId);
      }
    });

    console.log("[BUTTON DEBUG] Attachment summary:", {
      totalProcessed: attachments.length,
      attached: attachedCount,
      notFound: notFoundCount,
      alreadyAttached: alreadyAttachedCount,
      stillPending: stillPending.length,
      retryCount,
    });

    // If there are still pending buttons and we haven't exceeded retry limit, try again
    if (stillPending.length > 0 && retryCount < 5) {
      console.log("[BUTTON DEBUG] Retrying button attachment in 200ms, attempt:", retryCount + 1);
      setTimeout(() => {
        attachButtonHandlers(stillPending, retryCount + 1);
      }, 200);
    } else if (stillPending.length > 0) {
      console.warn("[BUTTON DEBUG] Failed to attach all buttons after max retries:", stillPending.map(p => p.buttonId));
    }
  }, [lastCallId]);

  // Handle button attachments after history updates
  useEffect(() => {
    if (pendingButtonAttachments.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready, then add a small delay
      requestAnimationFrame(() => {
        setTimeout(() => {
          attachButtonHandlers([...pendingButtonAttachments]);
          setPendingButtonAttachments([]);
        }, 100);
      });
    }
  }, [pendingButtonAttachments, attachButtonHandlers]);

  // Additional effect to catch buttons that might be added through other means
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      let newButtonsFound = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check if the added node is a button with an action ID or contains such buttons
              const actionButtons = element.id?.startsWith('button-') 
                ? [element as HTMLButtonElement]
                : Array.from(element.querySelectorAll('button[id^="button-"]'));

              if (actionButtons.length > 0) {
                newButtonsFound = true;
                console.log('[BUTTON DEBUG] MutationObserver detected new action buttons:', 
                  actionButtons.map(btn => btn.id));
                
                // Check if any of these buttons don't have click handlers
                actionButtons.forEach((button) => {
                  if (!(button as HTMLButtonElement).onclick) {
                    console.log('[BUTTON DEBUG] Found unattached button via MutationObserver:', button.id);
                    // Note: We can't directly attach here because we don't have the action context
                    // This is mainly for debugging to see if buttons are being added after our attachment
                  }
                });
              }
            }
          });
        }
      });
    });

    // Start observing only the response area, not the entire document
    const responseArea = responseAreaRef.current;
    if (responseArea) {
      observer.observe(responseArea, {
        childList: true,
        subtree: true
      });
    }

    return () => observer.disconnect();
  }, []);

  // Fallback event delegation system for button clicks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleDelegatedClick = (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if the clicked element is a button with an action ID
      if (target.tagName === 'BUTTON' && target.id && target.id.startsWith('button-')) {
        const buttonData = buttonActionRegistry.current.get(target.id);
        
        if (buttonData) {
          const { action, match, groups } = buttonData;
          
          // Only handle if the button doesn't already have an onclick handler
          const button = target as HTMLButtonElement;
          if (!button.onclick) {
            console.log("[BUTTON DEBUG] Fallback event delegation handling click:", {
              buttonId: target.id,
              actionType: action.type,
              hasCallback: !!action.callback,
              hasClickCode: !!action.clickCode,
            });

            // Prevent default and stop propagation to avoid conflicts
            event.preventDefault();
            event.stopPropagation();

            if (action.callback) {
              console.log("[BUTTON DEBUG] Executing callback via delegation for:", target.id);
              action.callback(match, groups);
            }

            if (action.clickCode) {
              try {
                console.log("[BUTTON DEBUG] Executing clickCode via delegation for:", target.id);
                const func = new Function("match", action.clickCode);
                func(match);
                if (typeof interactionClicked === 'function') {
                  interactionClicked(lastCallId, "action");
                }
              } catch (error) {
                console.error("[BUTTON DEBUG] Error executing clickCode via delegation:", error);
              }
            }

            // Remove from registry after successful execution to prevent memory leaks
            buttonActionRegistry.current.delete(target.id);
            console.log("[BUTTON DEBUG] Removed button from registry after execution:", target.id);
          }
        }
      }
    };

    // Add the delegated event listener to the document (using bubble phase instead of capture)
    document.addEventListener('click', handleDelegatedClick, false);

    return () => {
      document.removeEventListener('click', handleDelegatedClick, false);
    };
  }, [lastCallId]);

  // Debug function to check DOM state - you can call this from browser console
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).debugChatPanelButtons = () => {
        const allButtons = document.querySelectorAll('button[id^="button-"]');
        const allButtonsAny = document.querySelectorAll("button");
        const buttonInfo = Array.from(allButtons).map((button) => ({
          id: button.id,
          hasOnclick: !!(button as HTMLButtonElement).onclick,
          textContent: button.textContent?.substring(0, 50),
          visible: (button as HTMLElement).offsetParent !== null,
          inDOM: document.contains(button),
          parentElement: button.parentElement?.tagName,
          outerHTML: button.outerHTML.substring(0, 200),
          inRegistry: buttonActionRegistry.current.has(button.id),
        }));

        console.log("[BUTTON DEBUG] Current DOM button state:", {
          totalButtons: allButtonsAny.length,
          actionButtons: allButtons.length,
          pendingAttachments: pendingButtonAttachments.length,
          registeredActions: buttonActionRegistry.current.size,
          historyKeys: Object.keys(history),
          buttons: buttonInfo,
          documentReady: document.readyState,
          bodyContainsButtons: document.body.innerHTML.includes("<button"),
          registryKeys: Array.from(buttonActionRegistry.current.keys()),
          orphanedInRegistry: Array.from(buttonActionRegistry.current.keys()).filter(
            id => !document.getElementById(id)
          ),
        });

        // Also log the current history content
        console.log(
          "[BUTTON DEBUG] Current history content:",
          Object.entries(history).map(([key, entry]) => ({
            key,
            contentLength: entry.content?.length || 0,
            hasButtons: entry.content?.includes("<button") || false,
            buttonCount: (entry.content?.match(/<button[^>]*>/g) || []).length,
            contentPreview: entry.content?.substring(0, 300) + "...",
          }))
        );

        return buttonInfo;
      };
    }
  }, [pendingButtonAttachments, history]);

  function hasVerticalScrollbar(element: any) {
    return element.scrollHeight > element.clientHeight;
  }

  // initial prompt change. Reset the chat history and get this response
  useEffect(() => {
    if (initialPrompt && initialPrompt !== "") {
      if (initialPrompt !== lastPrompt) {
        setIsLoading(true);

        // Clear thinking blocks for new response
        setThinkingBlocks([]);
        setCurrentThinkingIndex(0);

        ensureConversation().then((convId) => {
          if (lastController) stop(lastController);
          const controller = new AbortController();
          send(
            initialPrompt,
            messages,
            [
              ...dataWithExtras(),
              {
                key: "--messages",
                data: messages.length.toString(),
              },
            ],
            true,
            true,
            service,
            convId,
            controller
          );

          // Store the context in component state
          setLastPrompt(initialPrompt);
          setLastMessages(messages);
          setLastKey(initialPrompt);
          setLastController(controller);
          setHistory({});
          
          // Clear button registry for new conversation
          buttonActionRegistry.current.clear();
          console.log("[BUTTON DEBUG] Cleared button registry for new conversation");
        });
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollToEnd) {
      if (window.top !== window.self) {
        const responseArea = responseAreaRef.current as any;
        responseArea.scrollTo({
          top: responseArea.scrollHeight,
          behavior: "smooth",
        });
      } else {
        // If the ChatPanel is not within an iframe
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
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

  useEffect(() => {
    console.log("followOnPromptChanged", followOnPrompt);
    if (followOnPrompt && followOnPrompt !== "") {
      continueChat(followOnPrompt);
    }
  }, [followOnPrompt]);

  const setCookie = (name: string, value: string, days: number = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    const sameSite = "; SameSite=Lax"; // Add SameSite attribute for security
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${value}${expires}; path=/${sameSite}${secure}`;
  };

  const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift();
    }
    return undefined;
  };

  const ensureConversation = () => {
    if (
      (!currentConversation || currentConversation === "") &&
      createConversationOnFirstChat
    ) {
      const browserInfo = getBrowserInfo();

      return fetch(`${publicAPIUrl}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: project_id ?? "",
          agentId: agent,
          customerId: currentCustomer?.customer_id ?? null,
          customerEmail: currentCustomer?.customer_user_email ?? null,
          timezone: browserInfo?.userTimezone,
          language: browserInfo?.userLanguage,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
              `HTTP error! status: ${res.status}, message: ${errorText}`
            );
          }
          return res.json();
        })
        .then((newConvo) => {
          if (newConvo?.id) {
            console.log("new conversation created", newConvo.id);
            setCurrentConversation(newConvo.id);
            return newConvo.id;
          }
          return "";
        })
        .catch((error) => {
          console.error("Error creating new conversation", error);
          return "";
        });
    }
    // If a currentConversation exists, return it in a resolved Promise.
    return Promise.resolve(currentConversation);
  };

  useEffect(() => {
    const isEmpty = (value: string | undefined | null): boolean => {
      return !value || value.trim() === "" || value.trim() === "undefined";
    };

    // First, try to save any new values to cookies
    let updatedValues = { ...currentCustomer };
    let needsUpdate = false;

    if (
      !isEmpty(currentCustomer?.customer_user_email) &&
      isEmailAddress(currentCustomer.customer_user_email ?? "")
    ) {
      setCookie(
        "llmasaservice-panel-customer-user-email",
        currentCustomer?.customer_user_email ?? ""
      );
      // Only update email state if it's different from the cookie-derived value
      if (emailInput !== currentCustomer.customer_user_email) {
        setEmailInput(currentCustomer.customer_user_email ?? "");
        setEmailInputSet(true);
        setEmailValid(true);
      }
    }

    if (isEmpty(currentCustomer?.customer_user_email)) {
      const cookieEmail = getCookie("llmasaservice-panel-customer-user-email");
      if (!isEmpty(cookieEmail) && isEmailAddress(cookieEmail ?? "")) {
        updatedValues.customer_user_email = cookieEmail;
        needsUpdate = true;
      }
    }

    // if the customer_id is not set, but the email is set, use the email as the customer_id
    if (
      isEmpty(currentCustomer?.customer_id) &&
      !isEmpty(updatedValues.customer_user_email) &&
      isEmailAddress(updatedValues.customer_user_email ?? "")
    ) {
      updatedValues.customer_id = updatedValues.customer_user_email ?? "";
      needsUpdate = true;
    }

    // Only update state if the derived values are actually different
    if (
      needsUpdate &&
      (updatedValues.customer_id !== currentCustomer.customer_id ||
        updatedValues.customer_user_email !==
          currentCustomer.customer_user_email)
    ) {
      // update the customer id and email in the conversation
      ensureConversation().then((convId) => {
        if (convId && convId !== "") {
          console.log(
            "updating conversation with customer id and email",
            convId,
            updatedValues
          );

          fetch(`${publicAPIUrl}/conversations/${convId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              project_id: project_id ?? "",
              customerId: updatedValues.customer_id,
              customerEmail: updatedValues.customer_user_email,
            }),
          }).catch((error) =>
            console.error("Failed to update conversation:", error)
          );
        }
      });

      setCurrentCustomer(updatedValues);
    }
  }, [currentCustomer, project_id, agent, publicAPIUrl, emailInput]);

  const continueChat = (suggestion?: string) => {
    console.log("continueChat", suggestion);

    // Clear thinking blocks for new response
    setThinkingBlocks([]);
    setCurrentThinkingIndex(0);

    // Auto-set email if valid before proceeding
    if (emailInput && isEmailAddress(emailInput) && !emailInputSet) {
      const newId =
        currentCustomer?.customer_id &&
        currentCustomer.customer_id !== "" &&
        currentCustomer.customer_id !== currentCustomer?.customer_user_email
          ? currentCustomer.customer_id
          : emailInput;

      setEmailInputSet(true);
      setEmailValid(true);
      setCurrentCustomer({
        customer_id: newId,
        customer_user_email: emailInput,
      });
    }

    // wait till new conversation created....
    ensureConversation().then((convId) => {
      console.log("current customer", currentCustomer);

      if (!idle) {
        stop(lastController);

        setHistory((prevHistory) => {
          return {
            ...prevHistory,
            [lastKey ?? ""]: {
              content:
                processThinkingTags(response).cleanedText +
                "\n\n(response cancelled)",
              callId: lastCallId,
            },
          };
        });

        return;
      }

      if (clearFollowOnQuestionsNextPrompt) {
        setFollowOnQuestionsState([]);
      }

      if (
        (suggestion && suggestion !== "") ||
        (nextPrompt && nextPrompt !== "")
      ) {
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

        let nextPromptToSend = suggestion ?? nextPrompt;

        let promptKey = nextPromptToSend ?? "";
        let lastPromptKeyCharacter = promptKey[promptKey.length - 1] ?? "";

        const count = Object.keys(history).filter((key) => {
          return (
            key.startsWith(promptKey) &&
            promptKey.length > 0 &&
            (key.endsWith(lastPromptKeyCharacter) || key.endsWith(")")) // the first or subsequent identical prompt beginnings
          );
        }).length;

        if (count > 0) {
          promptKey += ` (${count + 1})`;
        }

        // set the history prompt with the about to be sent prompt
        setHistory((prevHistory) => {
          return {
            ...prevHistory,
            [promptKey ?? ""]: { content: "", callId: "" },
          };
        });

        // if this is the first user message, use the template. otherwise it is a follow-on question(s)
        if (
          (initialPrompt &&
            initialPrompt !== "" &&
            Object.keys(history).length === 1) ||
          ((!initialPrompt || initialPrompt === "") &&
            Object.keys(history).length === 0)
        ) {
          if (promptTemplate && promptTemplate !== "") {
            nextPromptToSend = promptTemplate.replace(
              "{{prompt}}",
              nextPromptToSend
            );
            for (let i = 0; i < data.length; i++) {
              nextPromptToSend = nextPromptToSend.replace(
                "{{" + data[i]?.key + "}}",
                data[i]?.data ?? ""
              );
            }
          }
        }

        console.log("Sending for conversation", convId);
        const controller = new AbortController();
        send(
          nextPromptToSend,
          messagesAndHistory,
          [
            ...dataWithExtras(),
            {
              key: "--messages",
              data: messagesAndHistory.length.toString(),
            },
          ],
          true,
          true,
          service,
          convId,
          controller
        );

        setLastPrompt(nextPromptToSend);
        setLastMessages(messagesAndHistory);
        setLastKey(promptKey);
        setLastController(controller);
        setNextPrompt("");
      }
    });
  };

  const replaceHistory = (newHistory: {
    [prompt: string]: { content: string; callId: string };
  }) => {
    setHistory(newHistory);
  };

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    interactionClicked(lastCallId, "copy");
  }

  const scrollToBottom = () => {
    if (window.top !== window.self) {
      const responseArea = responseAreaRef.current as any;
      responseArea.scrollTo({
        top: responseArea.scrollHeight,
        behavior: "smooth",
      });
    } else {
      // If the ChatPanel is not within an iframe
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const convertMarkdownToHTML = (markdown: string): string => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ReactMarkdown
        className={markdownClass}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {markdown}
      </ReactMarkdown>
    );
    return html;
  };

  const convertHistoryToHTML = (history: {
    [prompt: string]: { callId: string; content: string };
  }): string => {
    const stylesheet = `
        <style>
      .conversation-history {
        font-family: Arial, sans-serif;
        line-height: 1.5; /* Slightly increase line height for readability */
      }
      .history-entry {
        margin-bottom: 15px;
      }
      .prompt-container, .response-container {
        margin-bottom: 10px; /* Adjusted spacing */
      }
      .prompt, .response {
        display: block; /* Ensure they take up the full row */
        margin: 5px 0; /* Add vertical spacing */
        padding: 10px; /* Increase padding for better spacing */
        border-radius: 5px;
        max-width: 80%; /* Keep width constrained */
      }
      .prompt {
        background-color: #efefef;
        margin-left: 0; /* Align to the left */
      }
      .response {
        background-color: #f0fcfd;
        margin-left: 25px; /* Indent slightly for visual differentiation */
      }
    </style>
`;

    let html = `
    <html>
      <head>
        ${stylesheet}
      </head>
      <body>
        <h1>Conversation History (${new Date().toLocaleString()})</h1>
        <div class="conversation-history">
  `;

    Object.entries(history).forEach(([prompt, response], index) => {
      if (hideInitialPrompt && index === 0) {
        html += `
        <div class="history-entry">
          <div class="response-container">
            <div class="response">${convertMarkdownToHTML(
              response.content
            )}</div>
          </div>
        </div>
      `;
      } else {
        html += `
      <div class="history-entry">
        <div class="prompt-container">
          <div class="prompt">${convertMarkdownToHTML(
            formatPromptForDisplay(prompt)
          )}</div>
        </div>
        <div class="response-container">
          <div class="response">${convertMarkdownToHTML(response.content)}</div>
        </div>
      </div>
    `;
      }
    });

    html += `
        </div>
      </body>
    </html>
  `;

    return html;
  };

  const saveHTMLToFile = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = (to: string, from: string) => {
    sendConversationsViaEmail(to, `Conversation History from ${title}`, from);
    interactionClicked(lastCallId, "email", to);
    setEmailSent(true);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    continueChat(suggestion);
    await interactionClicked(lastCallId, "suggestion");
  };

  const sendConversationsViaEmail = async (
    to: string,
    subject: string = `Conversation History from ${title}`,
    from: string = ""
  ) => {
    fetch(`${publicAPIUrl}/share/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: to,
        from: from,
        subject: subject,
        html: convertHistoryToHTML(history),
        project_id: project_id ?? "",
        customer: currentCustomer,
        history: history,
        title: title,
      }),
    });

    await interactionClicked(lastCallId, "email", from);
  };

  const sendCallToActionEmail = async (from: string) => {
    const r = await fetch(`${publicAPIUrl}/share/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: callToActionEmailAddress,
        from: from,
        subject: `${callToActionEmailSubject} from ${from}`,
        html: convertHistoryToHTML(history),
        project_id: project_id ?? "",
        customer: currentCustomer,
        history: history,
        title: title,
      }),
    });

    await interactionClicked(lastCallId, "cta", from);

    setCallToActionSent(true);
  };

  const interactionClicked = async (
    callId: string,
    action: string,
    emailaddress: string = "",
    comment: string = ""
  ) => {
    console.log(`Interaction clicked: ${action} for callId: ${callId}`);

    ensureConversation().then((convId) => {
      // special case where no call made yet, and they click on Suggestion/CTA/Email/Save
      if (!callId || callId === "") callId = convId;

      const email =
        emailaddress && emailaddress !== ""
          ? emailaddress
          : isEmailAddress(currentCustomer?.customer_user_email ?? "")
          ? currentCustomer?.customer_user_email
          : isEmailAddress(currentCustomer?.customer_id ?? "")
          ? currentCustomer?.customer_id
          : "";

      fetch(`${publicAPIUrl}/feedback/${callId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: project_id ?? "",
          conversation_id: convId ?? "",
          email: email,
          comment: comment,
        }),
      });
    });
  };

  const formatPromptForDisplay = (prompt: string): string => {
    if (!prompt) {
      return "";
    }

    if (hideRagContextInPrompt && prompt.includes("CONTEXT:")) {
      const parts = prompt.split("CONTEXT:");
      const withoutContext = parts.length > 0 ? (parts[0] as string) : "";

      // Remove the optional chaining since withoutContext is always a string
      if (withoutContext.includes("PROMPT:")) {
        const promptParts = withoutContext.split("PROMPT:");
        return promptParts.length > 1
          ? (promptParts[1] || "").trim()
          : withoutContext.trim();
      }

      return withoutContext.trim();
    }

    return prompt;
  };

  const isDisabledDueToNoEmail = () => {
    const valid = isEmailAddress(emailInput);
    if (valid) return false;
    if (customerEmailCaptureMode === "REQUIRED") return true;
    return false;
  };

  // helper to dedupe tool names
  const getUniqueToolNames = (reqs: typeof pendingToolRequests) =>
    Array.from(new Set(reqs.map((r) => r.toolName)));

  // called by each button
  const handleToolApproval = (
    toolName: string,
    scope: "once" | "session" | "always"
  ) => {
    if (scope === "session" || scope === "always") {
      setSessionApprovedTools((p) => Array.from(new Set([...p, toolName])));
    }
    if (scope === "always") {
      setAlwaysApprovedTools((p) => Array.from(new Set([...p, toolName])));
    }

    // process and remove just this tool’s calls
    const requestsToRun = pendingToolRequests.filter(
      (r) => r.toolName === toolName
    );
    processGivenToolRequests(requestsToRun);
    setPendingToolRequests((p) => p.filter((r) => r.toolName !== toolName));
  };

  // auto‐process pending tools that were previously approved (session or always)
  useEffect(() => {
    if (pendingToolRequests.length === 0) return;
    const toAuto = pendingToolRequests.filter(
      (r) =>
        sessionApprovedTools.includes(r.toolName) ||
        alwaysApprovedTools.includes(r.toolName)
    );
    if (toAuto.length > 0) {
      processGivenToolRequests(toAuto);
      setPendingToolRequests((prev) =>
        prev.filter(
          (r) =>
            !sessionApprovedTools.includes(r.toolName) &&
            !alwaysApprovedTools.includes(r.toolName)
        )
      );
    }
  }, [pendingToolRequests, sessionApprovedTools, alwaysApprovedTools]);

  return (
    <>
      <div
        style={{ width: width, height: height }}
        className={"llm-panel" + (theme === "light" ? "" : " dark-theme")}
      >
        {title && title !== "" ? <div className="title">{title}</div> : null}
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

          {Object.entries(history).map(([prompt, historyEntry], index) => {
            const isLastEntry = index === Object.keys(history).length - 1;
            const hasToolData = !!(
              (historyEntry?.toolCalls?.length || 0) > 0 ||
              (historyEntry?.toolResponses?.length || 0) > 0
            );

            return (
              <div className="history-entry" key={index}>
                {hideInitialPrompt && index === 0 ? null : (
                  <div className="prompt">{formatPromptForDisplay(prompt)}</div>
                )}

                <div className="response">
                  {/* Show streaming response with thinking blocks displayed separately */}
                  {index === Object.keys(history).length - 1 &&
                  (isLoading || !idle) ? (
                    <div className="streaming-response">
                      {/* Display current thinking block or thinking message */}
                      {(() => {
                        const { cleanedText } = processThinkingTags(
                          response || ""
                        );

                        // If we have thinking blocks, show the current one
                        if (thinkingBlocks.length > 0) {
                          const isOnLastBlock =
                            currentThinkingIndex === thinkingBlocks.length - 1;
                          const hasMainContent =
                            cleanedText && cleanedText.trim().length > 0;
                          const shouldShowLoading =
                            isOnLastBlock && !hasMainContent;

                          return (
                            <div>
                              {renderThinkingBlocks()}
                              {/* Show animated thinking if we're showing the last block and no main content yet */}
                              {shouldShowLoading && (
                                <div className="loading-text">
                                  Thinking...&nbsp;
                                  <div className="dot"></div>
                                  <div className="dot"></div>
                                  <div className="dot"></div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // If no thinking blocks yet but no main content, show generic thinking
                        if (!cleanedText || cleanedText.length === 0) {
                          return (
                            <div className="loading-text">
                              Thinking...&nbsp;
                              <div className="dot"></div>
                              <div className="dot"></div>
                              <div className="dot"></div>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* Display the main content (cleaned of thinking tags) */}
                      {(() => {
                        const { cleanedText } = processThinkingTags(
                          response || ""
                        );
                        return cleanedText && cleanedText.length > 0 ? (
                          <ReactMarkdown
                            className={markdownClass}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{ /*a: CustomLink,*/ code: CodeBlock }}
                          >
                            {cleanedText}
                          </ReactMarkdown>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div>
                      {/* For completed responses, show stored thinking blocks if this is the last entry */}
                      {isLastEntry &&
                        thinkingBlocks.length > 0 &&
                        renderThinkingBlocks()}

                      {/* Show the main content (cleaned of thinking tags) */}
                      <ReactMarkdown
                        className={markdownClass}
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{ /*a: CustomLink,*/ code: CodeBlock }}
                      >
                        {processThinkingTags(historyEntry.content).cleanedText}
                      </ReactMarkdown>
                    </div>
                  )}

                  {isLastEntry && pendingToolRequests.length > 0 && (
                    <div className="approve-tools-panel">
                      {getUniqueToolNames(pendingToolRequests).map(
                        (toolName) => {
                          const tool = toolList.find(
                            (t) => t.name === toolName
                          );
                          return (
                            <div key={toolName} className="approve-tool-item">
                              <div className="approve-tools-header">
                                Tool “{toolName}” requires approval <br />
                              </div>

                              <div className="approve-tools-buttons">
                                <button
                                  className="approve-tools-button"
                                  onClick={() =>
                                    handleToolApproval(toolName, "once")
                                  }
                                  disabled={isLoading}
                                >
                                  Approve Once
                                </button>
                                <button
                                  className="approve-tools-button"
                                  onClick={() =>
                                    handleToolApproval(toolName, "session")
                                  }
                                  disabled={isLoading}
                                >
                                  Approve This Chat
                                </button>
                                <button
                                  className="approve-tools-button"
                                  onClick={() =>
                                    handleToolApproval(toolName, "always")
                                  }
                                  disabled={isLoading}
                                >
                                  Approve Always
                                </button>
                                <br />
                              </div>

                              {tool?.description && (
                                <div className="approve-tools-description">
                                  {tool.description}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {idle && !isLoading && pendingToolRequests.length === 0 && (
                    <div className="button-container">
                      <button
                        className="copy-button"
                        onClick={() => {
                          copyToClipboard(historyEntry.content);
                        }}
                        disabled={isDisabledDueToNoEmail()}
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

                      <button
                        className="thumbs-button"
                        onClick={() => {
                          if (thumbsUpClick) thumbsUpClick(historyEntry.callId);
                          interactionClicked(historyEntry.callId, "thumbsup");
                        }}
                        disabled={isDisabledDueToNoEmail()}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="icon-svg"
                        >
                          <path d="M20.22 9.55C19.79 9.04 19.17 8.75 18.5 8.75H14.47V6C14.47 4.48 13.24 3.25 11.64 3.25C10.94 3.25 10.31 3.67 10.03 4.32L7.49 10.25H5.62C4.31 10.25 3.25 11.31 3.25 12.62V18.39C3.25 19.69 4.32 20.75 5.62 20.75H17.18C18.27 20.75 19.2 19.97 19.39 18.89L20.71 11.39C20.82 10.73 20.64 10.06 20.21 9.55H20.22ZM5.62 19.25C5.14 19.25 4.75 18.86 4.75 18.39V12.62C4.75 12.14 5.14 11.75 5.62 11.75H7.23V19.25H5.62ZM17.92 18.63C17.86 18.99 17.55 19.25 17.18 19.25H8.74V11.15L11.41 4.9C11.45 4.81 11.54 4.74 11.73 4.74C12.42 4.74 12.97 5.3 12.97 5.99V10.24H18.5C18.73 10.24 18.93 10.33 19.07 10.5C19.21 10.67 19.27 10.89 19.23 11.12L17.91 18.62L17.92 18.63Z" />
                        </svg>
                      </button>

                      <button
                        className="thumbs-button"
                        onClick={() => {
                          if (thumbsDownClick)
                            thumbsDownClick(historyEntry.callId);
                          interactionClicked(historyEntry.callId, "thumbsdown");
                        }}
                        disabled={isDisabledDueToNoEmail()}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="icon-svg"
                        >
                          <path d="M18.38 3.25H6.81C5.72 3.25 4.79 4.03 4.6 5.11L3.29 12.61C3.18 13.27 3.36 13.94 3.78 14.45C4.21 14.96 4.83 15.25 5.5 15.25H9.53V18C9.53 19.52 10.76 20.75 12.36 20.75C13.06 20.75 13.69 20.33 13.97 19.68L16.51 13.75H18.39C19.7 13.75 20.76 12.69 20.76 11.38V5.61C20.76 4.31 19.7 3.25 18.39 3.25H18.38ZM15.26 12.85L12.59 19.1C12.55 19.19 12.46 19.26 12.27 19.26C11.58 19.26 11.03 18.7 11.03 18.01V13.76H5.5C5.27 13.76 5.07 13.67 4.93 13.5C4.78 13.33 4.73 13.11 4.77 12.88L6.08 5.38C6.14 5.02 6.45001 4.76 6.82 4.76H15.26V12.85ZM19.25 11.38C19.25 11.86 18.86 12.25 18.38 12.25H16.77V4.75H18.38C18.86 4.75 19.25 5.14 19.25 5.61V11.38Z" />
                        </svg>
                      </button>

                      {(idle || hasToolData) && (
                        <button
                          className="copy-button"
                          title="Show Tool Call/Response JSON"
                          onClick={() => {
                            const historyEntry = history[prompt];
                            setToolInfoData({
                              calls: historyEntry?.toolCalls ?? [],
                              responses: historyEntry?.toolResponses ?? [],
                            });
                            setIsToolInfoModalOpen(true);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="icon-svg"
                          >
                            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <ToolInfoModal
            isOpen={isToolInfoModalOpen}
            onClose={() => setIsToolInfoModalOpen(false)}
            data={toolInfoData}
          />

          {followOnQuestionsState &&
            followOnQuestionsState.length > 0 &&
            idle &&
            !isLoading &&
            pendingToolRequests.length === 0 && (
              <div className="suggestions-container">
                {followOnQuestionsState.map((question, index) => (
                  <button
                    key={index}
                    className="suggestion-button"
                    onClick={() => handleSuggestionClick(question)}
                    disabled={!idle || isDisabledDueToNoEmail()}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

          <div ref={bottomRef} />

          {hasScroll && !isAtBottom && (
            <button className="scroll-button" onClick={scrollToBottom}>
              ↓
            </button>
          )}
        </div>
        {showEmailPanel && (
          <>
            {!emailValid && (
              <div className="email-input-message">
                {isDisabledDueToNoEmail()
                  ? "Let's get started - please enter your email"
                  : CTAClickedButNoEmail || emailClickedButNoEmail
                  ? "Sure, we just need an email address to contact you"
                  : "Email address is invalid"}
              </div>
            )}
            <div className="email-input-container">
              <input
                type="email"
                name="email"
                id="email"
                className={
                  emailValid
                    ? emailInputSet
                      ? "email-input-set"
                      : "email-input"
                    : "email-input-invalid"
                }
                placeholder={customerEmailCapturePlaceholder}
                value={emailInput}
                onChange={(e) => {
                  const newEmail = e.target.value;
                  setEmailInput(newEmail);

                  // Reset validation state while typing
                  if (!emailInputSet) {
                    if (
                      customerEmailCaptureMode === "REQUIRED" &&
                      newEmail !== ""
                    ) {
                      setEmailValid(isEmailAddress(newEmail));
                    } else {
                      setEmailValid(true);
                    }
                  }
                }}
                onBlur={() => {
                  // Auto-validate and set email when field loses focus
                  if (
                    emailInput &&
                    isEmailAddress(emailInput) &&
                    !emailInputSet
                  ) {
                    const newId =
                      currentCustomer?.customer_id &&
                      currentCustomer.customer_id !== "" &&
                      currentCustomer.customer_id !==
                        currentCustomer?.customer_user_email
                        ? currentCustomer.customer_id
                        : emailInput;

                    setEmailInputSet(true);
                    setEmailValid(true);
                    setCurrentCustomer({
                      customer_id: newId,
                      customer_user_email: emailInput,
                    });

                    // Handle pending actions
                    if (CTAClickedButNoEmail) {
                      sendCallToActionEmail(emailInput);
                      setCTAClickedButNoEmail(false);
                    }
                    if (emailClickedButNoEmail) {
                      handleSendEmail(emailInput, emailInput);
                      setEmailClickedButNoEmail(false);
                    }
                  } else if (
                    customerEmailCaptureMode === "REQUIRED" &&
                    emailInput !== ""
                  ) {
                    setEmailValid(isEmailAddress(emailInput));
                  }
                }}
                disabled={false}
              />
              {emailInputSet && (
                <button
                  className="email-input-button"
                  onClick={() => {
                    setEmailInputSet(false);
                    setEmailValid(true);
                  }}
                  title="Edit email"
                >
                  ✎
                </button>
              )}
            </div>
          </>
        )}
        <div className="button-container-actions">
          {showSaveButton && (
            <button
              className="save-button"
              onClick={() => {
                saveHTMLToFile(
                  convertHistoryToHTML(history),
                  `conversation-${new Date().toISOString()}.html`
                );
                interactionClicked(lastCallId, "save");
              }}
              disabled={isDisabledDueToNoEmail()}
            >
              Save Conversation
            </button>
          )}
          {showEmailButton && (
            <button
              className="save-button"
              onClick={() => {
                if (isEmailAddress(emailInput)) {
                  setEmailInputSet(true);
                  setEmailValid(true);
                  handleSendEmail(emailInput, emailInput);
                  setEmailClickedButNoEmail(false);
                } else {
                  setShowEmailPanel(true);
                  setEmailValid(false);
                  setEmailClickedButNoEmail(true);
                }
              }}
              disabled={isDisabledDueToNoEmail()}
            >
              {"Email Conversation" + (emailSent ? " ✓" : "")}
            </button>
          )}

          {showCallToAction && (
            <button
              className="save-button"
              onClick={() => {
                if (isEmailAddress(emailInput)) {
                  setEmailInputSet(true);
                  setEmailValid(true);
                  sendCallToActionEmail(emailInput);
                  setCTAClickedButNoEmail(false);
                } else {
                  setShowEmailPanel(true);
                  setEmailValid(false);
                  setCTAClickedButNoEmail(true);
                }
              }}
              disabled={isDisabledDueToNoEmail()}
            >
              {callToActionButtonText + (callToActionSent ? " ✓" : "")}
            </button>
          )}
        </div>

        <EmailModal
          isOpen={isEmailModalOpen}
          defaultEmail={emailInput ?? ""}
          onClose={() => setIsEmailModalOpen(false)}
          onSend={handleSendEmail}
        />

        <div className="input-container">
          <textarea
            className="chat-input"
            placeholder={placeholder}
            value={nextPrompt}
            onChange={(e) => setNextPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (nextPrompt !== "") {
                  e.preventDefault();
                  continueChat();
                }
              }
            }}
            disabled={isDisabledDueToNoEmail()}
          ></textarea>
          <button
            className="send-button"
            onClick={() => continueChat()}
            disabled={isDisabledDueToNoEmail()}
          >
            {idle ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1"
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
        {showPoweredBy && (
          <div
            className={`footer-container ${
              mcpServers && mcpServers.length > 0 ? "with-tools" : "no-tools"
            }`}
          >
            {/* Tool status indicator - only show when tools are configured */}
            {mcpServers && mcpServers.length > 0 && (
              <div className="footer-left">
                <div className="tool-status">
                  <span
                    className={`tool-status-dot ${
                      toolsLoading
                        ? "loading"
                        : toolsFetchError
                        ? "error"
                        : "ready"
                    }`}
                    title={
                      !toolsLoading && !toolsFetchError && toolList.length > 0
                        ? toolList
                            .map(
                              (tool) =>
                                `${tool.name}: ${
                                  tool.description || "No description"
                                }`
                            )
                            .join("\n")
                        : ""
                    }
                  ></span>
                  <span
                    className="tool-status-text"
                    title={
                      !toolsLoading && !toolsFetchError && toolList.length > 0
                        ? toolList
                            .map(
                              (tool) =>
                                `${tool.name}: ${
                                  tool.description || "No description"
                                }`
                            )
                            .join("\n")
                        : ""
                    }
                  >
                    {toolsLoading
                      ? "tools loading..."
                      : toolsFetchError
                      ? "tool fetch failed"
                      : toolList.length > 0
                      ? `${toolList.length} tools ready`
                      : "no tools found"}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`footer-right ${
                mcpServers && mcpServers.length > 0 ? "" : "footer-center"
              }`}
            >
              <div className="powered-by">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 72 72"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse
                    cx="14.0868"
                    cy="59.2146"
                    rx="7.8261"
                    ry="7.7854"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="24.9013"
                    cy="43.0776"
                    rx="6.11858"
                    ry="6.08676"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="45.391"
                    cy="43.0776"
                    rx="6.11858"
                    ry="6.08676"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="65.8813"
                    cy="43.0776"
                    rx="6.11858"
                    ry="6.08676"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="13.9444"
                    cy="30.4795"
                    rx="4.83795"
                    ry="4.81279"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="34.7193"
                    cy="30.4795"
                    rx="4.83795"
                    ry="4.81279"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="55.4942"
                    cy="30.4795"
                    rx="4.83795"
                    ry="4.81279"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="3.27273"
                    cy="20.4293"
                    rx="3.27273"
                    ry="3.25571"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="24.9011"
                    cy="20.4293"
                    rx="3.27273"
                    ry="3.25571"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="45.3914"
                    cy="20.4293"
                    rx="3.27273"
                    ry="3.25571"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="12.2373"
                    cy="13.4931"
                    rx="1.70751"
                    ry="1.69863"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="33.0122"
                    cy="13.4931"
                    rx="1.70751"
                    ry="1.69863"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="53.5019"
                    cy="13.4931"
                    rx="1.70751"
                    ry="1.69863"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="19.3517"
                    cy="6.13242"
                    rx="1.13834"
                    ry="1.13242"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="40.1266"
                    cy="6.13242"
                    rx="1.13834"
                    ry="1.13242"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="60.901"
                    cy="6.13242"
                    rx="1.13834"
                    ry="1.13242"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="34.8617"
                    cy="59.2146"
                    rx="7.8261"
                    ry="7.7854"
                    fill="#2487D8"
                  />
                  <ellipse
                    cx="55.6366"
                    cy="59.2146"
                    rx="7.8261"
                    ry="7.7854"
                    fill="#ED7D31"
                  />
                </svg>{" "}
                &nbsp;&nbsp;powered by&nbsp;
                <a
                  href="https://llmasaservice.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  llmasaservice.io
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomPanelRef} />
      {/* Modal with iframe */}
      {iframeUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div style={{ position: "relative", width: "95vw", height: "95vh" }}>
            <button
              onClick={() => setIframeUrl(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10000,
                background: "#fff",
                border: "none",
                padding: "5px 5px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <iframe
              src={iframeUrl}
              title="Dynamic Iframe"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;
