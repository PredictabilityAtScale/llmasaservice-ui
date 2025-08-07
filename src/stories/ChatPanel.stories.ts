import type { Meta, StoryObj } from "@storybook/react";
import ChatPanel from "../ChatPanel";
import { LLMAsAServiceCustomer } from "llmasaservice-client";

const meta = {
  title: "ChatPanel",
  component: ChatPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChatPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChatPanelStory: Story = {
  args: {
    title: "Test Title",
    project_id: "[get this from your  control panel]",
    initialPrompt: "Hi",
    hideInitialPrompt: true,
    placeholder: "Type a message",
    theme: "light",
    messages: [],
    width:"300px",
    height:"100vh",
    initialMessage: "This is a initial message."
  },
};

export const ChatPanelWithNewConversationButton: Story = {
  args: {
    title: "Chat Panel with New Conversation Button",
    project_id: "[get this from your control panel]",
    initialPrompt: "Hello! How can I help you today?",
    hideInitialPrompt: false,
    placeholder: "Type your message here...",
    theme: "light",
    messages: [
      { role: "assistant", content: "Welcome! This conversation has some history." },
      { role: "user", content: "Tell me about the weather" },
      { role: "assistant", content: "I'd be happy to help with weather information. However, I don't have access to real-time weather data. You might want to check a weather service like Weather.com or use a weather app on your device." }
    ],
    width: "400px",
    height: "600px",
    showNewConversationButton: true,
    showSaveButton: true,
    showEmailButton: true,
    initialMessage: "Try clicking the 'New Conversation' button - it requires two clicks to confirm the reset and prevent accidental conversation clearing!",
    initialHistory: {
      "Hello! How can I help you today?": {
        content: "Welcome! This is a test conversation with some existing history. The 'New Conversation' button now requires double-click confirmation to prevent accidental resets.",
        callId: "test-call-1"
      }
    }
  },
};

export const ChatPanelThumbsStory: Story = {
  args: {
    title: "Chat",
    project_id: "[get this from your  control panel]",
    initialPrompt: "Hi",
    hideInitialPrompt: true,
    placeholder: "Type a message",
    theme: "dark",
    thumbsUpClick: () => alert("Thumbs up clicked"),
    thumbsDownClick: () => alert("Thumbs down clicked"),
    width:"300px",
    height:"100vh",
  },
};

export const ChatPanelSystemInstructionStory: Story = {
  args: {
    title: "Chat with a pirate",
    project_id: "[get this from your  control panel]",
    initialPrompt: "introduce yourself",
    hideInitialPrompt: true,
    placeholder: "Type a message",
    theme: "dark",
    thumbsUpClick: () => alert("Thumbs up clicked"),
    thumbsDownClick: () => alert("Thumbs down clicked"),
    messages: [
      {
        role: "assistant",
        content: "Give all responses like a pirate",
      },
    ],
    width:"300px",
    height:"100vh",
  },
};

export const ChatPanelHorizontalThumbsStory: Story = {
  args: {
    title: "Chat",
    project_id: "[get this from your  control panel]",
    initialPrompt: "Hi",
    hideInitialPrompt: true,
    placeholder: "Type a message",
    theme: "dark",
    thumbsUpClick: () => alert("Thumbs up clicked"),
    thumbsDownClick: () => alert("Thumbs down clicked"),
    width:"800px",
    height:"400px",
  },
};
