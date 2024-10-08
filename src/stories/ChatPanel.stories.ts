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
