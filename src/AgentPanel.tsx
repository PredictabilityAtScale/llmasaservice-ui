import React, { useEffect, useState } from "react";
import materialDark from "react-syntax-highlighter/dist/esm/styles/prism/material-dark.js";
import materialLight from "react-syntax-highlighter/dist/esm/styles/prism/material-light.js";
import ChatPanel from "./ChatPanel";
import { LLMAsAServiceCustomer } from "llmasaservice-client";
import PrismStyle from "react-syntax-highlighter";

export interface AgentPanelProps {
  //project_id: string;
  //initialPrompt?: string;
  //initialMessage?: string;
  //title?: string;
  //placeholder?: string;
  //hideInitialPrompt?: boolean;
  customer?: LLMAsAServiceCustomer;
  messages?: { role: "user" | "assistant"; content: string }[];
  data?: { key: string; data: string }[];
  thumbsUpClick?: (callId: string) => void;
  thumbsDownClick?: (callId: string) => void;
  theme?: "light" | "dark";
  //markdownClass?: string;
  width?: string;
  height?: string;
  url?: string;
  //scrollToEnd?: boolean;
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
  //promptTemplate?: string;
  actions?: {
    pattern: string;
    type?: string;
    markdown?: string;
    callback?: (match: string, groups: any[]) => void;
    clickCode?: string;
    style?: string;
  }[];
  //showSaveButton?: boolean;
  //showEmailButton?: boolean;
  followOnQuestions?: string[];
  clearFollowOnQuestionsNextPrompt?: boolean;
  followOnPrompt?: string;
  showPoweredBy?: boolean;
  agent: string;
  conversation?: string | null;
  //showCallToAction?: boolean;
  //callToActionButtonText?: string;
  //callToActionEmailAddress?: string;
  //callToActionEmailSubject?: string;
  //callToActionMustSendEmail?: boolean;
  //ragQueryLimit?: number;
  //ragRankLimit?: number;
  initialHistory?: { [key: string]: { content: string; callId: string } };
  hideRagContextInPrompt?: boolean;
}
interface ExtraProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

const AgentPanel: React.FC<AgentPanelProps & ExtraProps> = ({
  //project_id,
  //initialPrompt = "",
  //title = "Chat",
  //placeholder = "Type a message",
  //hideInitialPrompt = true,
  customer = {} as LLMAsAServiceCustomer,
  messages = [],
  data = [],
  thumbsUpClick,
  thumbsDownClick,
  theme,
  //markdownClass = null,
  width,
  height,
  url = "https://chat.llmasaservice.io/",
  //scrollToEnd = false,
  //initialMessage = "",
  prismStyle = null,
  service = null,
  historyChangedCallback = undefined,
  responseCompleteCallback = undefined,
  //promptTemplate = "",
  actions = [],
  //showSaveButton = true,
  //showEmailButton = true,
  followOnQuestions = [],
  clearFollowOnQuestionsNextPrompt = false,
  //followOnPrompt = "",
  showPoweredBy = true,
  agent,
  conversation = null,
  //showCallToAction = false,
  //callToActionButtonText = "Submit",
  //callToActionEmailAddress = "",
  //callToActionEmailSubject = "Agent CTA submitted",
  //callToActionMustSendEmail = false,
  //ragQueryLimit = 10,
  //ragRankLimit = 5,
  initialHistory = {},
  hideRagContextInPrompt = true,
}) => {
  const [followOnPrompt, setFollowOnPrompt] = useState<string>("");

  const searchParams = new URLSearchParams(location.search);
  //const id = searchParams.get("id") || "";
  const customer_id = searchParams.get("customer_id") || "";
  const customer_email = searchParams.get("customer_email") || "";
  const [agentData, setAgentData] = useState<any>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const response = await fetch(
          url.endsWith("dev")
            ? `https://8ftw8droff.execute-api.us-east-1.amazonaws.com/dev/agents/${agent}`
            : `https://api.llmasaservice.io/agents/${agent}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (data && data.length > 0) {
          setAgentData(data[0]);
        }
      } catch (error) {
        console.error("Error fetching agent data:", error);
      }
    };

    if (agent && agent !== "") {
      //console.log("fetching agent data", agent);
      fetchAgentData();
    }
  }, [agent]);

  // url = "https://chat.llmasaservice.io/";
  // url = "https://chat.llmasaservice.io/dev";

  const getActionsArraySafely = (actionsString: string) => {
    let actions: any[] = [];
    if (actionsString && actionsString !== "") {
      try {
        actions = JSON.parse(actionsString);
        if (!Array.isArray(actions)) {
          throw new Error("Parsed actions is not an array");
        }
      } catch (error) {
        actions = [];
      }
    }
    return actions;
  };

  return (
    <>
      {agentData && (
        <ChatPanel
          project_id={agentData?.projectId}
          service={agentData?.groupId || null}
          url={url}
          title={agentData?.displayTitle ?? ""}
          theme={
            theme
              ? theme
              : agentData?.displayTheme === "light"
              ? "light"
              : "dark"
          }
          cssUrl={agentData?.cssUrl ?? ""}
          height={height ? height : agentData?.displayHeight ?? "100vh"}
          width={width ? width : agentData?.displayWidth ?? "100%"}
          promptTemplate={agentData?.displayPromptTemplate ?? "{{prompt}}"}
          initialMessage={
            agentData?.displayStartMessageOrPrompt === "message"
              ? agentData?.displayInitialMessageOrPrompt ?? ""
              : undefined
          }
          initialPrompt={
            agentData?.displayStartMessageOrPrompt === "prompt"
              ? agentData?.displayInitialMessageOrPrompt ?? ""
              : undefined
          }
          followOnQuestions={
            followOnQuestions && followOnQuestions.length > 0
              ? followOnQuestions
              : agentData?.displayFollowOnPrompts?.split("|") ?? []
          }
          clearFollowOnQuestionsNextPrompt={clearFollowOnQuestionsNextPrompt}
          historyChangedCallback={historyChangedCallback}
          responseCompleteCallback={responseCompleteCallback}
          prismStyle={
            prismStyle ??
            (theme
              ? ((theme === "light" ? materialLight : materialDark) as any)
              : ((agentData?.displayTheme === "light"
                  ? materialLight
                  : materialDark) as any))
          }
          actions={[
            ...actions,
            ...getActionsArraySafely(agentData?.displayActions),
          ]}
          followOnPrompt={followOnPrompt}
          agent={agent}
          placeholder={agentData?.displayPlaceholder ?? "Type a message"}
          hideInitialPrompt={agentData?.displayHideInitialPrompt ?? true}
          data={[...data, { key: "data", data: agentData?.data }]}
          showEmailButton={agentData?.displayShowEmailButton ?? true}
          showSaveButton={agentData?.displayShowSaveButton ?? true}
          showCallToAction={agentData?.displayShowCallToAction ?? false}
          callToActionButtonText={
            agentData?.displayCallToActionButtonText ?? "Submit"
          }
          callToActionEmailAddress={
            agentData?.displayCallToActionEmailAddress ?? ""
          }
          callToActionEmailSubject={
            agentData?.displayCallToActionEmailSubject ?? "Agent CTA Submitted"
          }
          callToActionMustSendEmail={
            agentData?.displayCallToActionMustSendEmail ?? false
          }
          customer={{
            customer_id: customer ? customer.customer_id : customer_id ?? "",
            customer_user_email: customer
              ? customer.customer_user_email
              : customer_email ?? "",
          }}
          scrollToEnd={agentData?.displayScrollToEnd ?? false}
          showPoweredBy={showPoweredBy}
          messages={messages}
          conversation={conversation}
          initialHistory={initialHistory}
          hideRagContextInPrompt={hideRagContextInPrompt}
        />
      )}
    </>
  );
};

export default AgentPanel;
