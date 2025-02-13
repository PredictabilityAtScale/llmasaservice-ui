import type { Meta, StoryObj } from "@storybook/react";
import { LLMAsAServiceCustomer } from "llmasaservice-client";
import AgentPanel from "../AgentPanel";

const meta = {
  title: "AgentPanel",
  component: AgentPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AgentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgentPanelStory: Story = {
  args: {
    title: "Test Title",
    project_id: "[get this from your  control panel]",
    agent: "[your agent id]"
  },
};

