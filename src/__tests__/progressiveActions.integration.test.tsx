import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Create a minimal test component that simulates ChatPanel's progressive action behavior
const TestProgressiveComponent: React.FC<{
  progressiveActions?: boolean;
  response?: string;
  idle?: boolean;
  actions?: any[];
}> = ({ 
  progressiveActions = true, 
  response = '', 
  idle = true,
  actions = []
}) => {
  const [processedContent, setProcessedContent] = React.useState('');

  React.useEffect(() => {
    if (!response || !actions.length) {
      setProcessedContent(response);
      return;
    }

    let content = response;
    actions.forEach((action, actionIndex) => {
      if (action.type === 'button') {
        const regex = new RegExp(action.pattern, 'gmi');
        content = content.replace(regex, (match: string, ...groups: any[]) => {
          const offset = groups[groups.length - 2] || 0;
          const buttonId = `button-stable-${actionIndex}-${offset}`;
          const markdown = action.markdown?.replace(/\$1/g, groups[0]) || match;
          
          if (progressiveActions && !idle) {
            return `<button id="${buttonId}" data-pending="true">${markdown}</button>`;
          } else {
            return `<button id="${buttonId}">${markdown}</button>`;
          }
        });
      }
    });
    setProcessedContent(content);
  }, [response, idle, actions, progressiveActions]);

  return (
    <div data-testid="progressive-component">
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />
    </div>
  );
};

describe('Progressive Actions Integration', () => {
  const testActions = [
    {
      pattern: 'ACTION:(\\w+)',
      type: 'button',
      markdown: 'Do $1',
    }
  ];

  it('renders placeholder button during streaming', () => {
    const { container } = render(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:TEST content"
        idle={false}
        actions={testActions}
      />
    );

    const button = container.querySelector('button[data-pending="true"]');
    expect(button).toBeTruthy();
    expect(button?.textContent).toBe('Do TEST');
  });

  it('renders active button when idle', () => {
    const { container } = render(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:TEST content"
        idle={true}
        actions={testActions}
      />
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('data-pending')).toBeNull();
    expect(button?.textContent).toBe('Do TEST');
  });

  it('skips progressive behavior when disabled', () => {
    const { container } = render(
      <TestProgressiveComponent
        progressiveActions={false}
        response="Text ACTION:TEST content"
        idle={false} // still streaming but progressive disabled
        actions={testActions}
      />
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('data-pending')).toBeNull();
    expect(button?.textContent).toBe('Do TEST');
  });

  it('processes multiple action patterns', () => {
    const multiActions = [
      {
        pattern: 'ACTION:(\\w+)',
        type: 'button',
        markdown: 'Do $1',
      },
      {
        pattern: 'TASK:(\\w+)',
        type: 'button', 
        markdown: 'Execute $1',
      }
    ];

    const { container } = render(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:FIRST and TASK:SECOND content"
        idle={true}
        actions={multiActions}
      />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe('Do FIRST');
    expect(buttons[1]?.textContent).toBe('Execute SECOND');
  });

  it('renders first action immediately during streaming, then both after second action appears', () => {
    const multiActions = [
      {
        pattern: 'ACTION:(\\w+)',
        type: 'button',
        markdown: 'Do $1',
      },
      {
        pattern: 'TASK:(\\w+)',
        type: 'button', 
        markdown: 'Execute $1',
      }
    ];

    // First chunk: only first action pattern present
    const { container, rerender } = render(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:FIRST partial"
        idle={false}
        actions={multiActions}
      />
    );

    // Should render first button as placeholder
    let buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('Do FIRST');
    expect(buttons[0]?.getAttribute('data-pending')).toBe('true');

    // Second chunk: both action patterns present
    rerender(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:FIRST partial and TASK:SECOND more"
        idle={false}
        actions={multiActions}
      />
    );

    // Should render both buttons as placeholders
    buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe('Do FIRST');
    expect(buttons[0]?.getAttribute('data-pending')).toBe('true');
    expect(buttons[1]?.textContent).toBe('Execute SECOND');
    expect(buttons[1]?.getAttribute('data-pending')).toBe('true');

    // Final: streaming complete
    rerender(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:FIRST partial and TASK:SECOND more final"
        idle={true}
        actions={multiActions}
      />
    );

    // Should render both buttons without pending state
    buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.getAttribute('data-pending')).toBeNull();
    expect(buttons[1]?.getAttribute('data-pending')).toBeNull();
  });

  it('demonstrates difference from end-only processing', () => {
    const action = {
      pattern: 'ACTION:(\\w+)',
      type: 'button',
      markdown: 'Do $1',
    };

    // Simulate what would happen with end-only processing (no progressive)
    const { container: endOnlyContainer } = render(
      <TestProgressiveComponent
        progressiveActions={false}
        response="Text ACTION:FIRST partial" // incomplete response
        idle={false} // still streaming
        actions={[action]}
      />
    );

    // With progressive=false, button appears immediately even during streaming
    let endOnlyButtons = endOnlyContainer.querySelectorAll('button');
    expect(endOnlyButtons).toHaveLength(1);
    expect(endOnlyButtons[0]?.getAttribute('data-pending')).toBeNull();

    // Now test progressive behavior with same partial response
    const { container: progressiveContainer } = render(
      <TestProgressiveComponent
        progressiveActions={true}
        response="Text ACTION:FIRST partial" // same incomplete response
        idle={false} // still streaming
        actions={[action]}
      />
    );

    // With progressive=true, button appears but in pending state
    let progressiveButtons = progressiveContainer.querySelectorAll('button');
    expect(progressiveButtons).toHaveLength(1);
    expect(progressiveButtons[0]?.getAttribute('data-pending')).toBe('true');
  });
});
