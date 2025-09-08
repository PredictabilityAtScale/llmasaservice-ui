import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import ChatPanel, { ChatPanelProps } from '../ChatPanel';

// We will mock useLLM so we can control streaming response + idle state
vi.mock('llmasaservice-client', () => {
  return {
    useLLM: () => mockUseLLMState,
  };
});

// Mock dependencies that might cause hangs
vi.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: string }) => React.createElement('div', { 'data-testid': 'markdown' }, children)
  };
});

vi.mock('react-syntax-highlighter', () => {
  return {
    Prism: ({ children }: { children: string }) => React.createElement('pre', {}, children)
  };
});

vi.mock('react-syntax-highlighter/dist/esm/styles/prism/material-dark.js', () => ({
  __esModule: true,
  default: {}
}));
vi.mock('react-syntax-highlighter/dist/esm/styles/prism/material-light.js', () => ({
  __esModule: true,
  default: {}
}));
vi.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {}
}));
vi.mock('rehype-raw', () => ({
  __esModule: true,
  default: () => {}
}));

interface MockState {
  response: string;
  idle: boolean;
  lastCallId: string;
  send: (...args: any[]) => void;
  stop: (...args: any[]) => void;
  setResponse: (r: string) => void;
}

let mockUseLLMState: any;

const baseProps: ChatPanelProps = {
  project_id: 'proj',
  actions: [
    {
      pattern: 'ACTION:(\\w+)',
      type: 'button',
      markdown: 'Do $1',
  // Cast to any because production code converts string to function at runtime
  callback: 'showAlertCallback($1)' as any
    }
  ],
};

beforeEach(() => {
  // Mock document.getElementById to avoid DOM operations that could cause hangs
  const originalGetElementById = document.getElementById;
  document.getElementById = vi.fn((id: string) => {
    // Return null for button IDs to simulate they don't exist (safe for cleanup)
    if (id.includes('button-')) {
      return null;
    }
    return originalGetElementById.call(document, id);
  });
  
  // Mock setInterval and setTimeout to prevent actual timers from running
  vi.spyOn(global, 'setInterval').mockImplementation((fn, delay) => {
    // Return a fake timer ID, but don't actually set the interval
    return 12345 as any;
  });
  
  vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
    // For zero delay timeouts (like autoResize), execute immediately
    if (delay === 0) {
      fn();
    }
    // For other timeouts, return a fake timer ID but don't execute
    return 12345 as any;
  });
  
  vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
  vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});
  
  // Mock fetch to avoid real network calls (tools, conversations, etc.)
  global.fetch = vi.fn(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/tools/')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('/conversations')) {
      // Simulate conversation creation
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'conv-test' }), { status: 200 });
      }
    }
    if (url.includes('/feedback/')) {
      return new Response('{}', { status: 200 });
    }
    if (url.includes('/share/email')) {
      return new Response('{}', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as any;

  mockUseLLMState = {
    response: '',
    idle: true, // Start idle
    lastCallId: 'call-1',
    send: vi.fn(),
    stop: vi.fn(),
    setResponse: (r: string) => {
      mockUseLLMState.response = r;
    }
  };
});

afterEach(() => {
  cleanup();
  // Restore original document.getElementById
  vi.restoreAllMocks();
});

describe('ChatPanel progressive actions', () => {
  it.skip('renders component without errors', { timeout: 5000 }, async () => {
    const { container } = render(<ChatPanel {...baseProps} progressiveActions={true} />);
    
    // Just verify the component renders
    expect(container).toBeInTheDocument();
    
    // Don't run all timers to avoid hanging on intervals
    // Just wait for component to stabilize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });

  it.skip('processes action patterns in response text', { timeout: 5000 }, async () => {
    const { container } = render(<ChatPanel {...baseProps} progressiveActions={true} />);

    // Simulate response with action pattern
    await act(async () => {
      mockUseLLMState.response = 'Some text ACTION:TEST more text';
      mockUseLLMState.idle = false; // streaming
      // Just wait a bit for re-render instead of running all timers
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Check if action pattern is processed (DOM contains button or transformed text)
    expect(container.innerHTML).toContain('ACTION:TEST');
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });
});

describe('ChatPanel initialHistory action formatting', () => {
  it.skip('processes action patterns in both prompts and responses from initialHistory', { timeout: 5000 }, async () => {
    const initialHistory = {
      'User prompt with <ACTION:SAVE:Save Document>': { 
        content: 'Assistant response with <ACTION:DEPLOY:Deploy Now> and another <ACTION:CANCEL:Cancel>', 
        callId: 'c1' 
      },
      'Second prompt without actions': {
        content: 'Response with <ACTION:REFRESH:Refresh Page>',
        callId: 'c2'
      }
    };

    const { container, getByText } = render(
      <ChatPanel {...baseProps} initialHistory={initialHistory} progressiveActions={true} />
    );

    // Wait for action processing to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Check that action patterns are converted to buttons in prompts
    const saveButton = container.querySelector('button[id*="button-init"][id*="0"]');
    expect(saveButton).toBeTruthy();
    expect(saveButton?.textContent).toContain('Save Document');

    // Check that action patterns are converted to buttons in responses  
    const deployButton = container.querySelector('button[id*="button-init"][id*="1"]');
    expect(deployButton).toBeTruthy();
    expect(deployButton?.textContent).toContain('Deploy Now');

    const cancelButton = container.querySelector('button[id*="button-init"][id*="2"]');
    expect(cancelButton).toBeTruthy();
    expect(cancelButton?.textContent).toContain('Cancel');

    const refreshButton = container.querySelector('button[id*="button-init"][id*="3"]');
    expect(refreshButton).toBeTruthy();
    expect(refreshButton?.textContent).toContain('Refresh Page');

    // Verify original action patterns are replaced (not visible as text)
    expect(container.innerHTML).not.toContain('<ACTION:SAVE:Save Document>');
    expect(container.innerHTML).not.toContain('<ACTION:DEPLOY:Deploy Now>');
    expect(container.innerHTML).not.toContain('<ACTION:CANCEL:Cancel>');
    expect(container.innerHTML).not.toContain('<ACTION:REFRESH:Refresh Page>');

    // Verify buttons use the correct ID pattern for initial history
    expect(container.innerHTML).toContain('button-init-');
  });

  it.skip('processes initialHistory actions when progressiveActions is disabled', { timeout: 5000 }, async () => {
    const initialHistory = {
      'Prompt with <ACTION:TEST:Test Action>': { 
        content: 'Response with <ACTION:VERIFY:Verify>', 
        callId: 'c1' 
      }
    };

    const { container } = render(
      <ChatPanel {...baseProps} initialHistory={initialHistory} progressiveActions={false} />
    );

    // Wait for action processing
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Actions should still be processed in initialHistory regardless of progressiveActions setting
    const testButton = container.querySelector('button[id*="button-init"]');
    expect(testButton).toBeTruthy();
    expect(testButton?.textContent).toContain('Test Action');

    const verifyButton = container.querySelector('button[id*="button-init"]');
    expect(verifyButton).toBeTruthy();
  });
});
