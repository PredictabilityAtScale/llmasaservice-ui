"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanelSystemInstructionStory = exports.ChatPanelThumbsStory = exports.ChatPanelStory = void 0;
const ChatPanel_1 = __importDefault(require("../ChatPanel"));
const meta = {
    title: "ChatPanel",
    component: ChatPanel_1.default,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};
exports.default = meta;
exports.ChatPanelStory = {
    args: {
        title: "Test Title",
        project_id: "[get this from your  control panel]",
        initialPrompt: "Hi",
        hideInitialPrompt: true,
        placeholder: "Type a message",
        theme: "light",
        messages: [],
    },
};
exports.ChatPanelThumbsStory = {
    args: {
        title: "Chat",
        project_id: "[get this from your  control panel]",
        initialPrompt: "Hi",
        hideInitialPrompt: true,
        placeholder: "Type a message",
        theme: "dark",
        thumbsUpClick: () => alert("Thumbs up clicked"),
        thumbsDownClick: () => alert("Thumbs down clicked"),
    },
};
exports.ChatPanelSystemInstructionStory = {
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
    },
};
